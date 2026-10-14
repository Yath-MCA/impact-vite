/**
 * CC Email Input Helper
 * Shared utility for parsing candidate CC values from free-form text.
 * john@@gmail.com; emma@domain, mike@.com, david@domain..com; sophia@domain space.com, olivia@domain-.com; ethan@domain@another.com, ava@domain.c, noah@domain.toolongtldddd; mia@domain#com, lucas@-domain.com; isabella@domain_.com, mason@domain..org; harper@domain,org, james@domain..; benjamin@domain.; charlotte@domain..co.in, liam@domain.., alex@domain,com

 */
class emailInputHelper {
    constructor(inputElement, options = {}) {
        if (!inputElement || !(inputElement instanceof HTMLElement)) {
            throw new Error('emailInputHelper requires an input element');
        }

        this.inputElement = inputElement;
        this.chipsContainer = inputElement.parentElement;
        this.emailRegex = options.emailRegex || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Z]{2,}$/i;
        this.limit = options.limit || 20;
        this.chipClass = options.chipClass || 'cc_mail';
        this.summaryClass = options.summaryClass || `${this.chipClass}_summary`;
        this.collapseLimit = Number.isInteger(options.collapseLimit) ? options.collapseLimit : 2;
        this.excludedEmails = new Set((Array.isArray(options.excludedEmails) ? options.excludedEmails : [])
            .map(email => this.normalizeEmail(email))
            .filter(Boolean)
        );
        this.excludedWarningKey = options.excludedWarningKey || '';
        this.collapsedChipLabelFormatter = typeof options.chipLabelFormatter === 'function' ?
            options.chipLabelFormatter :
            ((email) => (email || '').split('@')[0]);
        this.expandedChipLabelFormatter = typeof options.expandedChipLabelFormatter === 'function' ?
            options.expandedChipLabelFormatter :
            ((email) => email || '');
        this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
        this.invalidSegments = [];
        this.isCollapsed = false;
        this.summaryElement = null;
        this._bound = {
            input: this.handleInput.bind(this),
            keydown: this.handleKeydown.bind(this),
            paste: this.handlePaste.bind(this),
            blur: this.handleBlur.bind(this),
            focus: this.handleFocus.bind(this),
            click: this.handleContainerClick.bind(this)
        };

        this.attachEvents();
    }

    attachEvents() {
        if (!this.inputElement) return;

        this.inputElement.oninput = this._bound.input;
        this.inputElement.onkeydown = this._bound.keydown;
        this.inputElement.onpaste = this._bound.paste;
        this.inputElement.onblur = this._bound.blur;
        this.inputElement.onfocus = this._bound.focus;
        if (this.chipsContainer) {
            this.chipsContainer.addEventListener('click', this._bound.click);
        }
    }

    detachEvents() {
        if (!this.inputElement) return;

        this.inputElement.oninput = null;
        this.inputElement.onkeydown = null;
        this.inputElement.onpaste = null;
        this.inputElement.onblur = null;
        this.inputElement.onfocus = null;
        if (this.chipsContainer) {
            this.chipsContainer.removeEventListener('click', this._bound.click);
        }
    }

    isValidEmail(email) {
        return typeof email === 'string' && this.emailRegex.test(email.trim());
    }

    normalizeEmail(email) {
        return (email || '').trim().toLowerCase();
    }

    isExcludedEmail(email) {
        return this.excludedEmails.has(this.normalizeEmail(email));
    }

    splitEntries(text) {
        if (!text || typeof text !== 'string') return [];

        return text
            .split(/[;,]+/)
            .map(entry => entry.trim())
            .filter(Boolean);
    }

    _hasCommittedSeparators(text) {
        return typeof text === 'string' && /[;,<>]/.test(text);
    }

    parseEmails(text) {
        if (!text || typeof text !== 'string') return [];

        return this.splitEntries(text)
            .flatMap(segment => {
                if (this.isValidEmail(segment)) {
                    return [segment.trim()];
                }

                const angleBracketMatch = segment.match(/<([^>]+)>/);
                if (angleBracketMatch) {
                    const email = angleBracketMatch[1].trim();
                    if (this.isValidEmail(email)) {
                        return [email];
                    }
                }

                const inlineMatches = segment.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g);
                return (inlineMatches || [])
                    .map(email => email.trim())
                    .filter(email => this.isValidEmail(email));
            });
    }

    getCurrentFragment() {
        if (!this.inputElement) return '';

        const rawValue = this.inputElement.value || '';
        const parts = rawValue.split(/[;,]/);
        return parts.length ? parts[parts.length - 1].trim() : '';
    }

    _getExistingEmails() {
        const emails = [];
        if (!this.chipsContainer) return emails;

        const nodes = this._getChipElements();
        nodes.forEach(element => {
            const email = element.getAttribute('data-email');
            if (email) {
                emails.push(email);
            }
        });

        return emails;
    }

    _getChipElements() {
        if (!this.chipsContainer) return [];
        return Array.from(this.chipsContainer.querySelectorAll(`.${this.chipClass}`))
            .filter(element => !element.classList.contains(this.summaryClass));
    }

    _parseAndFilter(rawValue, existingEmails = []) {
        const normalizedExisting = new Set(
            (existingEmails || []).map(email => this.normalizeEmail(email))
        );

        const validEmails = [];
        const invalidSegments = [];
        let overflowCount = 0;
        let remainingSlots = Math.max(0, this.limit - existingEmails.length);

        if (remainingSlots <= 0) {
            this.splitEntries(rawValue).forEach(segment => {
                const extracted = this.parseEmails(segment);
                if (extracted.length > 0) {
                    extracted.forEach(email => {
                        if (!normalizedExisting.has(this.normalizeEmail(email))) {
                            overflowCount += 1;
                        }
                    });
                } else {
                    invalidSegments.push(segment);
                }
            });
            return {
                validEmails: [],
                invalidSegments,
                overflowCount,
                invalidValue: invalidSegments.join(', ')
            };
        }

        this.splitEntries(rawValue).forEach(segment => {
            const extracted = this.parseEmails(segment);
            if (extracted.length > 0) {
                let addedFromSegment = 0;
                extracted.forEach(email => {
                    if (remainingSlots <= 0) {
                        overflowCount += 1;
                        return;
                    }

                    const normalized = this.normalizeEmail(email);
                    if (!normalizedExisting.has(normalized)) {
                        normalizedExisting.add(normalized);
                        validEmails.push(email);
                        remainingSlots -= 1;
                        addedFromSegment += 1;
                    }
                });
            } else {
                invalidSegments.push(segment);
            }
        });

        return {
            validEmails,
            invalidSegments,
            overflowCount,
            invalidValue: invalidSegments.join(', ')
        };
    }

    _updateInputValidation(isValid) {
        if (!this.inputElement) return;

        this.inputElement.classList[isValid ? 'add' : 'remove']('is-valid');
        this.inputElement.classList[isValid ? 'remove' : 'add']('is-invalid');
        if (this.inputElement.value.trim() === '') {
            this.inputElement.classList.remove('is-invalid', 'is-valid');
        }
    }

    _setInvalidState() {
        this._updateInputValidation(false);
    }

    _hasInvalidEntries() {
        return this.invalidSegments.length > 0 || (
            !!this.inputElement &&
            this.inputElement.value.trim() !== '' &&
            this.inputElement.classList.contains('is-invalid')
        );
    }

    _ensureSummaryElement() {
        if (!this.chipsContainer) return null;
        if (!this.summaryElement || !this.summaryElement.isConnected) {
            this.summaryElement = document.createElement('span');
            this.summaryElement.classList.add(this.chipClass, this.summaryClass);
            this.summaryElement.tabIndex = 0;
            this.summaryElement.addEventListener('click', () => {
                this.expandChips();
                if (this.inputElement) this.inputElement.focus();
            });
        }
        return this.summaryElement;
    }

    _removeSummaryElement() {
        if (this.summaryElement && this.summaryElement.parentElement) {
            this.summaryElement.parentElement.removeChild(this.summaryElement);
        }
    }

    _setChipLabel(element, label) {
        if (!element) return;
        const labelNode = element.querySelector('.helper-chip-label');
        if (labelNode) {
            labelNode.textContent = label;
        }
    }

    _updateChipLabels(collapsed = false) {
        this._getChipElements().forEach((chip) => {
            const email = chip.getAttribute('data-email') || '';
            const label = collapsed ?
                this.collapsedChipLabelFormatter(email) :
                this.expandedChipLabelFormatter(email);
            this._setChipLabel(chip, label);
        });
    }

    _updateCollapsedSummary() {
        const summary = this._ensureSummaryElement();
        const chips = this._getChipElements();
        if (!summary || !this.inputElement) return;

        const hiddenCount = Math.max(0, chips.length - this.collapseLimit);
        if (hiddenCount <= 0) {
            this._removeSummaryElement();
            return;
        }

        summary.textContent = `${hiddenCount} more`;
        summary.classList.toggle('has-error', this._hasInvalidEntries());
        this.chipsContainer.insertBefore(summary, this.inputElement);
    }

    collapseChips() {
        const chips = this._getChipElements();
        if (!this.inputElement) return;

        if (chips.length <= this.collapseLimit) {
            this.isCollapsed = false;
            this._updateChipLabels(false);
            this._removeSummaryElement();
            return;
        }

        this._updateChipLabels(true);
        chips.forEach((chip, index) => {
            chip.classList.toggle('helper-chip-hidden', index >= this.collapseLimit);
        });
        this.isCollapsed = true;
        this._updateCollapsedSummary();
    }

    expandChips() {
        const chips = this._getChipElements();
        this._updateChipLabels(false);
        chips.forEach((chip) => chip.classList.remove('helper-chip-hidden'));
        this.isCollapsed = false;
        this._removeSummaryElement();
    }

    addEmailChip(email) {
        if (!this.chipsContainer || !this.inputElement) return null;
        if (this._getExistingEmails().length >= this.limit) return null;

        const emailName = this.expandedChipLabelFormatter(email);
        const emailDom = document.createElement('span');
        emailDom.classList.add(this.chipClass);
        emailDom.setAttribute('data-email', email);

        const labelSpan = document.createElement('span');
        labelSpan.classList.add('helper-chip-label');
        labelSpan.textContent = emailName;
        emailDom.appendChild(labelSpan);

        const removeImg = document.createElement('img');
        removeImg.classList.add('ml-1', 'n_Img', 'cc_img');
        removeImg.src = 'assets/images/svg/dialogClose.svg';
        removeImg.addEventListener('mousedown', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
        });
        removeImg.addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            this.removeChip(emailDom);
        });
        emailDom.appendChild(removeImg);

        this.chipsContainer.insertBefore(emailDom, this.inputElement);
        this._notifyChange();
        return emailDom;
    }

    removeChip(element) {
        if (element && element.parentElement) {
            element.parentElement.removeChild(element);
        }
        this._notifyChange();
    }

    _notifyChange() {
        if (this.isCollapsed) {
            this.collapseChips();
        } else {
            this._getChipElements().forEach((chip) => chip.classList.remove('helper-chip-hidden'));
            this._removeSummaryElement();
        }

        if (this.onChange) {
            this.onChange(this.collectEmails());
        }
    }

    _showLimitWarning(allowedCount, overflowCount) {
        if (!overflowCount || typeof TOASTER_ALERT !== 'function') return;

        TOASTER_ALERT('EmailLimitReached', {
            type: 'warning',
            Mustache: true,
            allowedCount,
            overflowCount,
            limit: this.limit
        });
    }

    _showExcludedWarning(excludedCount) {
        if (!excludedCount || !this.excludedWarningKey || typeof TOASTER_ALERT !== 'function') return;

        TOASTER_ALERT(this.excludedWarningKey, {
            type: 'warning',
            Mustache: true,
            excludedCount
        });
    }

    flushInput() {
        if (!this.inputElement) return false;

        const rawValue = this.inputElement.value.trim();
        if (!rawValue) {
            this._updateInputValidation(false);
            return false;
        }

        const existingEmails = this._getExistingEmails();
        var {
            validEmails,
            invalidSegments,
            overflowCount,
            invalidValue
        } = this._parseAndFilter(rawValue, existingEmails);
        const keepInvalidRemainder = !validEmails.length && !this._hasCommittedSeparators(rawValue);
        this.invalidSegments = keepInvalidRemainder ? invalidSegments : invalidSegments.slice();
        const excludedCount = validEmails.filter((email) => this.isExcludedEmail(email)).length;
        validEmails = validEmails.filter((email) => !this.isExcludedEmail(email));

        validEmails.forEach(email => this.addEmailChip(email));
        this._showLimitWarning(validEmails.length, overflowCount);
        this._showExcludedWarning(excludedCount);
        this.inputElement.value = keepInvalidRemainder ? invalidValue : '';
        this._updateInputValidation(this.getCurrentFragment() !== '' && this.isValidEmail(this.getCurrentFragment()));
        this._notifyChange();
        return validEmails.length > 0;
    }

    collectEmails() {
        const existingEmails = this._getExistingEmails();
        const rawValue = this.inputElement ? this.inputElement.value : '';
        const leftover = this.parseEmails(rawValue);

        const normalizedExisting = new Set(existingEmails.map(email => this.normalizeEmail(email)));
        const collected = [...existingEmails];
        const limit = Math.max(0, this.limit);

        leftover.forEach(email => {
            if (collected.length >= limit) return;
            const normalized = this.normalizeEmail(email);
            if (!normalizedExisting.has(normalized)) {
                normalizedExisting.add(normalized);
                collected.push(email);
            }
        });

        return collected.slice(0, limit);
    }

    handleInput() {
        this.expandChips();
        this._syncValidationFromFragment();
        this._notifyChange();
    }

    _syncValidationFromFragment() {
        const fragment = this.getCurrentFragment();
        this._updateInputValidation(fragment !== '' && this.isValidEmail(fragment));
    }

    handleKeydown(evt) {
        const triggerKeys = ['Enter', ',', ';', 'Tab'];
        if (!triggerKeys.includes(evt.key)) return;

        if (!this.inputElement || this.inputElement.value.trim() === '') return;

        const added = this.flushInput();
        if (added && evt.key !== 'Tab') {
            evt.preventDefault();
        }

        if (!added && evt.key === 'Enter') {
            this._setInvalidState();
        }
    }

    handlePaste(evt) {
        if (!evt.clipboardData || !this.inputElement) return;

        evt.preventDefault();
        const pastedText = evt.clipboardData.getData('text');
        const existingText = this.inputElement.value;
        this.inputElement.value = existingText ? `${existingText} ${pastedText}` : pastedText;
        this.flushInput();
        this.handleInput();
    }

    handleBlur() {
        if (!this.inputElement) return;

        this.flushInput();
        this._syncValidationFromFragment();
        this._notifyChange();
        this.collapseChips();
    }

    handleFocus() {
        this.invalidSegments = [];
        this.expandChips();
    }

    handleContainerClick(evt) {
        if (!this.chipsContainer || !this.inputElement) return;
        if (evt.target && evt.target.closest(`.${this.chipClass}`) && !evt.target.closest(`.${this.summaryClass}`) && evt.target.tagName !== 'INPUT') {
            return;
        }
        this.expandChips();
        this.inputElement.focus();
    }
}
