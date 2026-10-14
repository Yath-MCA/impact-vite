/**
 * QcValidationModule — editor Internal Validation (BaseModule + Core).
 * Messages via supportingFiles (context.js) → window.QC_VALIDATION_MESSAGES.
 */
import QcValidationCore from './QcValidationCore.js';

class QcValidationModule extends BaseModule {
    constructor(name = 'QualityValidationModule', errorTracker = null, options = {}) {
        super(name, errorTracker, options);

        const core = new QcValidationCore();
        Object.keys(core).forEach((key) => {
            // Keep Module.prototype.setAllLabels bridge (do not copy Core's bound version).
            if (key === 'setAllLabels') return;
            this[key] = core[key];
        });

        this._Id = this._id = 'qualityCheckerDialog';
        this.canUnmountComponentWhileClose = true;
        this._bindQcMethods();
    }

    showBefore() {
        return true;
    }

    /**
     * Thin editor bridge: BaseModule.setAllLabels (IMPACT.lang.en + messages.json
     * via getModuleMessages / supportingFiles). Core.applyQcStaticLabels for Track.
     */
    setAllLabels(options = {}) {
        BaseModule.prototype.setAllLabels.call(this, options);
    }
}

Object.getOwnPropertyNames(QcValidationCore.prototype).forEach((key) => {
    if (key === 'constructor') return;
    if (typeof QcValidationCore.prototype[key] !== 'function') return;
    if (Object.prototype.hasOwnProperty.call(QcValidationModule.prototype, key)) return;
    QcValidationModule.prototype[key] = QcValidationCore.prototype[key];
});

export default QcValidationModule;