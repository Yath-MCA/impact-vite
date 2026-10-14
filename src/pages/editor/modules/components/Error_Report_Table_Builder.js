class TableBuilder {
    constructor() {
        this.styles = {
            table: 'width:100%; border-collapse: collapse;',
            header: 'background-color: #f2f2f2;',
            cell: 'border: 1px solid #ddd; padding: 4px;',
            errorText: 'color: red;',
            blueText: 'color: blue;',
            centered: 'text-align: center;'
        };
    }

    createCell(content, additionalStyles = '') {
        const style = `${this.styles.cell}${additionalStyles ? '; ' + additionalStyles : ''}`;
        return `<td style="${style}">${content}</td>`;
    }

    createHeaderCell(content) {
        return `<th style="${this.styles.cell}">${content}</th>`;
    }

    createRow(cells) {
        return `<tr>${cells.join('')}</tr>`;
    }

    buildTable(headerCells, rows) {
        return `
            <table class="error-report-table" style="${this.styles.table}">
                <thead>
                    <tr style="${this.styles.header}">
                        ${headerCells.map(cell => this.createHeaderCell(cell)).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `.trim();
    }
}
class ErrorReportRenderer {
    constructor() {
        this.tableBuilder = new TableBuilder();
    }

    renderProjectInfoTable(projectInfo) {
        const headerCells = ['Project', 'User', 'Role', 'Version', 'Domain'];
        const rowCells = [
            this.tableBuilder.createCell(`${projectInfo.project}<br>${projectInfo.docid || DOC_ID}`),
            this.tableBuilder.createCell(projectInfo.userId),
            this.tableBuilder.createCell(projectInfo.userRole),
            this.tableBuilder.createCell(iVersion, this.tableBuilder.styles.blueText),
            this.tableBuilder.createCell(WEB_PAGE, this.tableBuilder.styles.errorText)
        ];

        return this.tableBuilder.buildTable(
            headerCells,
            this.tableBuilder.createRow(rowCells)
        );
    }

    renderErrorTable(errors) {
        const headerCells = [
            'Module',
            'Function',
            'Message',
            'Trace Order',
            'Repeat Count',
            'Timestamp'
        ];

        const rows = errors.map(error => {
            const cells = [
                this.tableBuilder.createCell(error.moduleName),
                this.tableBuilder.createCell(error.functionName),
                this.tableBuilder.createCell(error.message, this.tableBuilder.styles.errorText),
                this.tableBuilder.createCell(error.track, this.tableBuilder.styles.blueText),
                this.tableBuilder.createCell(error.repeatCount, this.tableBuilder.styles.centered),
                this.tableBuilder.createCell(error.timestamp)
            ];
            return this.tableBuilder.createRow(cells);
        }).join('');

        return this.tableBuilder.buildTable(headerCells, rows);
    }
}
class EnhancedErrorTracker {
    constructor() {
        // Central storage for all module errors
        this.modules = {};
        this._globalPersistKey = 'global_error_tracking';
        // Increased to accommodate multiple modules
        this.MAX_STORED_ERRORS = 5000;
        this.MAX_ERRORS_PER_MODULE = 100;

        this.renderer = new ErrorReportRenderer();
        this.IGNORE_LIST = {
            modules: ['system'],
            functions: ['lazyInitialization', 'initialization_failed', 'initializeModule', 'loadModuleClass', 'loadModuleImmediately', 'loadModuleInstance', 'registerModule'],
            messages: [/ref_form/i, /loadModuleClass/i]
        };
        // Load stored errors
        this.loadStoredErrors();
    }
    isIgnored(moduleName, functionName, message) {
        if (this.IGNORE_LIST.modules.includes(moduleName)) return true;
        if (this.IGNORE_LIST.functions.includes(functionName)) return true;
        if (this.IGNORE_LIST.messages.some(pattern => {
                if (pattern instanceof RegExp) return pattern.test(message);
                return message.includes(pattern);
            })) return true;
        return false;
    }

    /**
     * Register a new module for error tracking
     * @param {string} moduleName - Name of the module
     */
    registerModule(moduleName) {
        if (!this.modules[moduleName]) {
            this.modules[moduleName] = {
                errors: [],
                lastErrorTimestamp: null
            };
        }
        return this;
    }

    /**
     * Log an error for a specific module
     * @param {string} moduleName - Name of the module
     * @param {string} functionName - Function where error occurred
     * @param {Error|string} error - Error object or message
     * @param {Object} [context={}] - Additional error context
     * @returns {Object} Error entry
     */

    logError(moduleName, functionName, error, context = {}) {

        const errorMessage = error instanceof Error ? error.message : String(error);

        if (this.isIgnored(moduleName, functionName, errorMessage)) return;

        // Ensure module is registered
        this.registerModule(moduleName);

        // Ensure error is an Error object
        const errorObj = error instanceof Error ? error : new Error(String(error));

        // Get module's error array
        const moduleErrors = this.modules[moduleName].errors;

        // Check for repeated errors
        const lastError = moduleErrors[moduleErrors.length - 1];
        const repeatCount = lastError &&
            lastError.message === errorObj.message &&
            lastError.functionName === functionName ?
            (lastError.repeatCount || 1) + 1 :
            1;



        // Create error entry
        const errorEntry = {
            id: this.generateUniqueId(),
            timestamp: this.formatTimestamp(new Date()),
            moduleName,
            functionName,
            message: errorObj.message,
            stack: this.sanitizeStack(errorObj.stack),
            context: this.sanitizeContext(context),
            track: this.track_Order(true),
            repeatCount
        };

        // Manage error array size for this module
        if (moduleErrors.length >= this.MAX_ERRORS_PER_MODULE) {
            // Remove oldest error
            moduleErrors.shift();
        }

        // Add to module errors and update timestamp
        moduleErrors.push(errorEntry);
        this.modules[moduleName].lastErrorTimestamp = new Date();

        // Manage global error count
        this.maintainGlobalErrorLimit();

        // Persist errors
        this.persistErrors();

        this.updateDB(errorEntry);
        // Console logging
        this.consoleLog(errorEntry);

        return errorEntry;
    }
    updateDB(errorEntry) {
        try {
            if (typeof commonfn === 'undefined' || typeof commonfn.callajax !== 'function') return;
            var docId = window.GET_DOC_ID ? window.GET_DOC_ID() : (typeof DOC_ID !== 'undefined' ? DOC_ID : '');
            const ErrorDB_Json = {
                "tbl": "ErrorLogs",
                "docid": docId,
                "module": errorEntry.moduleName,
                "function": errorEntry.functionName,
                "errormsg": errorEntry.message,
                "iversion": typeof iVersion !== 'undefined' ? iVersion : '',
                "domain": window.location.hostname,
                "stack": errorEntry.stack,
                "track": errorEntry.track,
                "repeatCount": errorEntry.repeatCount,
                "timestamp": errorEntry.timestamp
            };
            if (typeof GET_JSON === "function") {
                try {
                    const defaults = GET_JSON("default");
                    Object.assign(ErrorDB_Json, defaults);
                } catch (e) {}
            }
            commonfn.callajax(ErrorDB_Json, 'ErrorudpateDBpost', API_UPDATE_INSERT);
        } catch (err) {
            console.error('Failed to sync error with database:', err);
        }
    }

    /**
     * Maintain global error limit across all modules
     */
    maintainGlobalErrorLimit() {
        const allErrors = this.getAllErrors();

        if (allErrors.length > this.MAX_STORED_ERRORS) {
            // Sort all errors by timestamp and remove oldest
            const sortedErrors = allErrors.sort((a, b) =>
                new Date(a.timestamp) - new Date(b.timestamp)
            );

            // Remove excess errors
            const excessCount = allErrors.length - this.MAX_STORED_ERRORS;
            sortedErrors.splice(0, excessCount);

            // Rebuild modules errors
            this.rebuildModuleErrorsFromSorted(sortedErrors);
        }
    }

    /**
     * Rebuild module errors from a sorted list
     * @param {Array} sortedErrors - Sorted array of errors
     */
    rebuildModuleErrorsFromSorted(sortedErrors) {
        // Reset all module errors
        this.resetErrors();

        // Redistribute sorted errors back to modules
        sortedErrors.forEach(error => {
            const moduleName = error.moduleName;
            if (this.modules[moduleName]) {
                this.modules[moduleName].errors.push(error);
            }
        });
    }
    resetErrors() {
        Object.values(this.modules).forEach(module => {
            module.errors = [];
        });
    }

    /**
     * Get all errors across all modules
     * @returns {Array} Sorted array of all errors
     */
    getAllErrors() {
        return Object.values(this.modules)
            .flatMap(module => module.errors)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    /**
     * Get recent errors for a specific module or all modules
     * @param {string} [moduleName] - Optional module name
     * @param {number} [limit=10] - Number of recent errors to retrieve
     * @returns {Array} Recent error entries
     */
    getRecentErrors(moduleName, limit = 10) {
        if (moduleName) {
            // Specific module errors
            return this.modules && this.modules[moduleName] && this.modules[moduleName].errors ?
                this.modules[moduleName].errors.slice(-limit).reverse() : [];
        }

        // All module errors
        return this.getAllErrors()
            .slice(-limit)
            .reverse();
    }


    /**
     * Sync errors with remote server
     * @returns {Promise<Object>} Sync results for each module
     */
    async syncWithServer() {
        const syncResults = {};

        for (const [moduleName, moduleData] of Object.entries(this.modules)) {
            if (moduleData.errors.length === 0 || !0) continue;

            try {
                const response = await fetch('/api/errors/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        errors: moduleData.errors,
                        moduleName,
                        userId: this.getProjectInfo().userId
                    })
                });

                syncResults[moduleName] = response.ok;

                // Clear errors if sync successful
                if (response.ok) {
                    moduleData.errors = [];
                }
            } catch (error) {
                console.error(`Error syncing errors for module ${moduleName}:`, error);
                syncResults[moduleName] = false;
            }
        }

        // Persist after sync
        this.persistErrors();

        return syncResults;
    }

    /**
     * Load stored errors from local storage
     */
    loadStoredErrors() {
        try {
            debug.log("loadStoredErrors");
            const urlParams = new URLSearchParams(window.location.search);
            const stored = localStorage.getItem(this._globalPersistKey.concat("_", urlParams.get('docid')));
            if (stored) {
                this.modules = JSON.parse(stored);
            }
        } catch {
            this.modules = {};
        }
    }

    /**
     * Persist errors to local storage
     */
    persistErrors(isRemove = false) {
        try {
            debug.log("persistErrors");
            if (isRemove) {
                localStorage.removeItem(this._globalPersistKey);
            } else {
                localStorage.setItem(this._globalPersistKey, JSON.stringify(this.modules));
            }
        } catch {
            console.error('Could not persist errors to local storage');
        }
    }

    /**
     * Clear all stored errors
     * @param {string} [moduleName] - Optional module name to clear
     */
    clearErrors(moduleName, reset) {

        if (moduleName) {
            // Clear specific module errors
            if (this.modules[moduleName]) {
                this.modules[moduleName].errors = [];
            }
        } else {
            // Clear all module errors
            this.resetErrors();
        }

        // Update local storage
        this.persistErrors();
    }

    // Utility methods from previous ErrorTracker (generateUniqueId, formatTimestamp, etc.)
    generateUniqueId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatTimestamp(date) {
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    track_Order() {
        return traceOrder();
    }
    sanitizeStack(stack) {
        if (!stack) return 'No stack trace';
        return stack.split('\n')
            .slice(0, 5)
            .map(frame => frame.trim())
            .join('\n');
    }

    sanitizeContext(context) {
        if (typeof context !== 'object') return {};

        const sanitizedContext = {};
        for (const [key, value] of Object.entries(context)) {
            if (typeof value === 'string') {
                sanitizedContext[key] = value.length > 200 ?
                    value.substring(0, 200) + '...' :
                    value;
            } else if (typeof value === 'object' && value !== null) {
                sanitizedContext[key] = '[Object]';
            } else {
                sanitizedContext[key] = value;
            }
        }
        return sanitizedContext;
    }

    getBrowserInfo() {
        // Extract the necessary fields 
        var info = window.browserInfo;

        var os = info.os;

        var browser = info.browser + "_" + info.version;

        var screenSize = info.screenSize;

        // Generate the report 
        var report = `${os}_${browser}_${screenSize}`;

        return {
            userAgent: browser,
            platform: os,
            language: navigator && navigator.language ? navigator.language : 'Unknown',
            screenSize: screenSize,
            report: report
        };
    }


    getProjectInfo() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            return {
                docid: urlParams.get('docid'),
                userRole: USER_INFO.ROLE_NAME,
                userId: USER_INFO.MAIL_ID_PREFIX || USER_INFO.MAIL_ID,
                project: SHARED_KEY.projectname || ""
            };
        } catch {
            return {
                userId: 'anonymous',
                userRole: 'anonymous',
                project: "anonymous",
                docid: ""
            };
        }
    }

    consoleLog(errorEntry) {
        console.group(`%c ERROR: ${errorEntry.moduleName} - ${errorEntry.functionName}`, 'color: red; font-weight: bold');
        console.warn('Message:', errorEntry.message);
        console.log('Timestamp:', errorEntry.timestamp);
        console.log('Repeat Count:', errorEntry.repeatCount);
        if (Object.keys(errorEntry.context).length) {
            console.log('Context:', errorEntry.context);
        }
        console.groupEnd();
    }

    /**
     * Render error report as an HTML table
     * @param {Object} options - Reporting options
     * @param {string} [options.moduleName] - Optional module name to filter errors
     * @param {number} [options.limit=50] - Max number of errors to retrieve
     * @param {boolean} [options.sortByRecent=true] - Sort errors by most recent first
     * @returns {string} HTML table of errors
     */
    renderErrorReportTable(options = {}) {
        const {
            moduleName,
            limit = 50,
            sortByRecent = true
        } = options;

        const projectInfo = this.getProjectInfo();
        const errors = this.getRecentErrors(moduleName, limit);

        if (errors.length == 0) return false;
        // const renderer = new ErrorReportRenderer();

        const introText = `
            <p>Dear Team,</p>
            <p>Sorry for the trouble. The file automatically sent to the Newgen Technical team for investigating the error. They will get back to you soon.</p>
        `.trim();

        const projectInfoTable = this.renderer.renderProjectInfoTable(projectInfo);
        const errorTable = this.renderer.renderErrorTable(errors);

        return `
            ${introText}
            ${projectInfoTable}
            <br>
            ${errorTable}
        `.trim();
    }

    /**
     * Export error report to CSV
     * @param {Object} options - Reporting options
     * @param {string} [options.moduleName] - Optional module name to filter errors
     * @param {number} [options.limit=50] - Max number of errors to retrieve
     * @param {boolean} [options.sortByRecent=true] - Sort errors by most recent first
     * @returns {string} CSV formatted error report
     */
    exportErrorReportCSV(options = {}) {
        const {
            moduleName,
            limit = 50,
            sortByRecent = true
        } = options;

        // Get errors (either for specific module or all modules)
        const errors = this.getRecentErrors(moduleName, limit);

        // CSV headers
        const headers = [
            'Timestamp', 'Module', 'Function', 'Message',
            'Repeat Count', 'Context', 'Browser', 'User ID'
        ];

        // Convert errors to CSV rows
        const csvRows = errors.map(error => [
            error.timestamp,
            error.moduleName,
            error.functionName,
            // Escape quotes
            error.message.replace(/"/g, '""'),
            error.repeatCount,
            JSON.stringify(error.context).replace(/"/g, '""'),
            JSON.stringify(error.browserInfo).replace(/"/g, '""'),
            error.userId
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.map(h => `"${h}"`).join(','),
            ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    }

    /**
     * Generate a comprehensive error report summary
     * @param {Object} options - Reporting options
     * @returns {Object} Error report summary
     */
    generateErrorReportSummary(options = {}) {
        const {
            moduleName,
            limit = 50
        } = options;

        const errors = this.getRecentErrors(moduleName, limit);

        // Aggregate error statistics
        const summary = {
            totalErrors: errors.length,
            moduleBreakdown: {},
            topErrorModules: [],
            mostFrequentErrors: [],
            timespan: {
                earliest: errors.length > 0 ? errors[0].timestamp : null,
                latest: errors.length > 0 ? errors[errors.length - 1].timestamp : null
            }
        };

        // Count errors per module
        errors.forEach(error => {
            summary.moduleBreakdown[error.moduleName] =
                (summary.moduleBreakdown[error.moduleName] || 0) + 1;
        });

        // Sort module breakdown to find top error modules
        summary.topErrorModules = Object.entries(summary.moduleBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([moduleName, count]) => ({
                moduleName,
                count
            }));

        // Find most frequent errors
        const errorFrequency = {};
        errors.forEach(error => {
            const key = `${error.moduleName}-${error.functionName}-${error.message}`;
            errorFrequency[key] = (errorFrequency[key] || 0) + 1;
        });

        summary.mostFrequentErrors = Object.entries(errorFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([key, count]) => {
                const [moduleName, functionName, message] = key.split('-');
                return {
                    moduleName,
                    functionName,
                    message,
                    count
                };
            });

        return summary;
    }
}
