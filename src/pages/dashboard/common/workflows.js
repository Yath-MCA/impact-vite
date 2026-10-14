class WorkflowViewer {
	constructor(options = {}) {
		this.explicitDataUrl = Object.prototype.hasOwnProperty.call(options, 'dataUrl');
		this.options = Object.assign({
			dataUrl: '../src/static/workflows/workflows.json',
			moduleListId: 'moduleList',
			workflowSelectorId: 'workflowSelector',
			workflowContainerId: 'workflowContainer',
			emptyStateMessage: 'Select a module to view available workflows.'
		}, options);

		this.workflows = {};
		this.currentModule = null;
		this.currentWorkflow = null;
		this.renderedDiagrams = new Set();

		this.moduleList = document.getElementById(this.options.moduleListId);
		this.workflowSelector = document.getElementById(this.options.workflowSelectorId);
		this.workflowContainer = document.getElementById(this.options.workflowContainerId);
	}



	async init() {
		if (!this.moduleList || !this.workflowSelector || !this.workflowContainer) {
			return;
		}

		this.initializeMermaid();
		this.showEmptyState(this.options.emptyStateMessage);
		await this.loadWorkflows();
	}
	getDataUrl() {
		if (this.explicitDataUrl && this.options.dataUrl) {
			return this.options.dataUrl;
		}

		var _ROOT = (typeof DOMAIN_ROOT !== 'undefined' ? DOMAIN_ROOT : '') +
			(typeof IS_LOCAL_HOST !== 'undefined' && IS_LOCAL_HOST ? 'dist/' : '');
		var version = (typeof iVersion !== 'undefined' ? iVersion : 'v1');
		var dataUrl = _ROOT + 'assets/' + version + '/meta/workflows.json';

		if (_ROOT || typeof iVersion !== 'undefined') {
			return dataUrl;
		}

		return this.options.dataUrl;
	}

	async loadJSON() {
		var dataUrl = this.getDataUrl();
		if (!dataUrl) {
			throw new Error('Workflow data URL is not configured');
		}

		const response = await fetch(dataUrl);
		if (!response.ok) {
			throw new Error('HTTP ' + response.status);
		}

		return response.json();
	}

	initializeMermaid() {
		if (typeof mermaid === 'undefined') {
			return;
		}

		mermaid.initialize({
			startOnLoad: false,
			theme: 'default',
			flowchart: {
				useMaxWidth: true,
				htmlLabels: true,
				curve: 'basis',
				rankSpacing: 50
			}
		});
	}

	async loadWorkflows() {
		try {
			this.workflows = await this.loadJSON();
			this.initializeUI();
		} catch (error) {
			console.error('Workflow load error:', error);
			this.showError(`Failed to load workflows: ${error.message}`);
		}
	}

	initializeUI() {
		this.moduleList.innerHTML = '';

		Object.entries(this.workflows).forEach(([moduleKey, moduleData]) => {
			const li = document.createElement('li');
			li.className = 'module-item';
			li.dataset.module = moduleKey;
			li.innerHTML = `
				<span class="module-icon">${moduleData.icon || '📑'}</span>
				<span>${moduleData.label}</span>
			`;
			li.addEventListener('click', () => this.selectModule(moduleKey));
			this.moduleList.appendChild(li);
		});

		this.renderWorkflowSelector();
		this.showEmptyState(this.options.emptyStateMessage);
	}

	selectModule(moduleKey) {
		this.currentModule = moduleKey;
		this.currentWorkflow = null;

		this.moduleList.querySelectorAll('.module-item').forEach((item) => {
			item.classList.toggle('active', item.dataset.module === moduleKey);
		});

		this.renderWorkflowSelector();
		this.showEmptyState('Select a workflow to view details.');
	}

	renderWorkflowSelector() {
		this.workflowSelector.innerHTML = '';

		if (!this.currentModule || !this.workflows[this.currentModule]) {
			return;
		}

		const workflowEntries = Object.entries(this.workflows[this.currentModule].workflows || {});
		if (workflowEntries.length === 0) {
			this.workflowSelector.innerHTML = '<p class="text-center">No workflows available</p>';
			return;
		}

		const fragment = document.createDocumentFragment();
		workflowEntries.forEach(([workflowKey, workflowData]) => {
			const button = document.createElement('button');
			button.className = 'workflow-btn';
			button.textContent = workflowData.name;
			button.dataset.workflow = workflowKey;
			button.addEventListener('click', () => this.selectWorkflow(workflowKey));
			fragment.appendChild(button);
		});

		this.workflowSelector.appendChild(fragment);
	}

	selectWorkflow(workflowKey) {
		this.currentWorkflow = workflowKey;

		this.workflowSelector.querySelectorAll('.workflow-btn').forEach((button) => {
			button.classList.toggle('active', button.dataset.workflow === workflowKey);
		});

		this.renderWorkflow();
	}

	renderWorkflow() {
		if (!this.currentModule || !this.currentWorkflow) {
			return;
		}

		const workflowData = this.workflows[this.currentModule].workflows[this.currentWorkflow];
		this.workflowContainer.innerHTML = '';

		const section = document.createElement('div');
		section.className = 'workflow-section active';

		const header = document.createElement('div');
		header.className = 'workflow-header';
		header.innerHTML = `
			<h2 class="workflow-title">${workflowData.name}</h2>
			<p class="workflow-description">${workflowData.description || ''}</p>
		`;
		section.appendChild(header);

		const table = document.createElement('table');
		table.className = 'workflow-table';
		table.innerHTML = `
			<thead>
				<tr>
					<th>Step</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody></tbody>
		`;

		workflowData.table.forEach(([step, description]) => {
			const row = document.createElement('tr');
			row.innerHTML = `<td>${step}</td><td>${description}</td>`;
			table.querySelector('tbody').appendChild(row);
		});
		section.appendChild(table);

		const diagramId = `diagram-${this.currentModule}-${this.currentWorkflow}`;
		this.renderedDiagrams.delete(diagramId);
		const diagramContainer = document.createElement('div');
		diagramContainer.className = 'diagram-container';
		diagramContainer.id = diagramId;

		const loading = document.createElement('span');
		loading.className = 'diagram-loading';
		loading.textContent = 'Click "Render Diagram" to load the Mermaid visualization...';

		const renderButton = document.createElement('button');
		renderButton.className = 'render-btn';
		renderButton.textContent = 'Render Diagram';
		renderButton.addEventListener('click', () => this.renderDiagram(this.currentModule, this.currentWorkflow, renderButton));

		diagramContainer.appendChild(loading);
		diagramContainer.appendChild(renderButton);
		section.appendChild(diagramContainer);

		this.workflowContainer.appendChild(section);
	}

	async renderDiagram(moduleKey, workflowKey, renderButton) {
		const diagramId = `diagram-${moduleKey}-${workflowKey}`;
		const container = document.getElementById(diagramId);
		if (!container) {
			return;
		}

		if (this.renderedDiagrams.has(diagramId)) {
			return;
		}

		const workflowData = this.workflows[moduleKey].workflows[workflowKey];
		container.innerHTML = '<span class="diagram-loading">Rendering diagram...</span>';

		if (renderButton) {
			renderButton.disabled = true;
		}

		try {
			if (typeof mermaid === 'undefined') {
				throw new Error('Mermaid library is not available');
			}

			const rendered = await mermaid.render(`mermaid-${Date.now()}`, workflowData.mermaid);
			container.innerHTML = rendered.svg;
			this.renderedDiagrams.add(diagramId);
		} catch (error) {
			console.error('Mermaid render error:', error);
			container.innerHTML = `
				<div class="diagram-error">
					<strong>Error rendering diagram:</strong><br>
					${error.message}
				</div>
			`;
		}
	}

	showEmptyState(message) {
		this.workflowContainer.innerHTML = `<div class="text-center mt-20"><p>${message}</p></div>`;
	}

	showError(message) {
		this.workflowContainer.innerHTML = `<div class="error">${message}</div>`;
	}
}

window.WorkflowViewer = WorkflowViewer;
