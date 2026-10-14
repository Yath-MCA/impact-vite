window.BITS_COLLECTION = {
    selectors: {

        // Front Matter structure
        frontMatter: '[data-name="front-matter"]',
        frontMatterPart: '[data-name="front-matter-part"]',
        bookPartMeta: '[data-name="book-part-meta"]',
        titleGroup: '[data-name="title-group"]',
        namedBookPartBody: '[data-name="named-book-part-body"]',
        toc: '[data-name="toc"]',
        sec: '[data-name="sec"]',

        // Book Body structure
        bookBody: '[data-name="book-body"]',
        bookPart: '[data-name="book-part"]',
        body: '[data-name="body"]',
        sec: '[data-name="sec"]',
        title: '[data-name="title"]',

        // Figures and Tables
        figures: '[data-name="fig"]',
        tables: '[data-name="table-wrap"]',
        caption: '[data-name="caption"]',

        // Back Matter
        back: '[data-name="back"]',
        fnGroup: '[data-name="fn-group"]',
        fn: '[data-name="fn"]',
        refList: '[data-name="ref-list"]',
        ref: '[data-name="ref"]'
    },
    setUpEditorInstance() {
        // Set up editor reference
        this.editor = window.GlobalEditor || window.CKEDITOR.instances.maineditor;
        if (!this.editor) {
            throw new Error('Editor instance not found');
        }

        // Set up document references
        this.globalDocument = this.editor.document;
        this.globalDocBody = this.globalDocument.getBody().$;
    },

    init: function (rootElement) {

        this.setUpEditorInstance();

        // this.root = rootElement || document;
        return this;
    },

    validateFrontMatter: function (frontMatter) {
        if (!frontMatter) return {
            isValid: false,
            missing: ['front-matter']
        };

        const required = {
            frontMatterPart: frontMatter.querySelector(this.selectors.frontMatterPart),
            namedBookPartBody: frontMatter.querySelector(this.selectors.namedBookPartBody),
            toc: frontMatter.querySelector(this.selectors.toc),
            others: frontMatter.querySelector(this.selectors.others)
        };

        return {
            isValid: Object.values(required).every(element => element !== null),
            missing: Object.entries(required)
                .filter(([_, element]) => element === null)
                .map(([key]) => key)
        };
    },
    validateFrontMatterPart: function (frontMatterPart) {
        if (!frontMatterPart) return {
            isValid: false,
            missing: ['front-matter-part']
        };

        const required = {
            bookPartMeta: frontMatterPart.querySelector(this.selectors.bookPartMeta)
        };

        return {
            isValid: Object.values(required).every(element => element !== null),
            missing: Object.entries(required)
                .filter(([_, element]) => element === null)
                .map(([key]) => key)
        };
    },
    validateNamedBookPartBody: function (namedBookPartBody) {
        if (!namedBookPartBody) return {
            isValid: false,
            missing: ['named-book-part-body']
        };

        const sections = namedBookPartBody.querySelectorAll(this.selectors.sec);
        return {
            isValid: sections.length > 0,
            missing: sections.length === 0 ? ['sections'] : []
        };
    },

    getFrontMatterCollection: function () {
        const frontMatter = this.globalDocBody.querySelector(this.selectors.frontMatter);
        if (!frontMatter) return null;

        const frontMatterValidation = this.validateFrontMatter(frontMatter);
        const frontMatterPart = frontMatter.querySelector(this.selectors.frontMatterPart);
        const namedBookPartBody = frontMatter.querySelector(this.selectors.namedBookPartBody);

        return {
            element: frontMatter,
            isValid: frontMatterValidation.isValid,
            validation: {
                structure: frontMatterValidation,
                frontMatterPart: this.validateFrontMatterPart(frontMatterPart),
                namedBookPartBody: this.validateNamedBookPartBody(namedBookPartBody)
            },
            parts: {
                frontMatterPart: frontMatterPart ? {
                    element: frontMatterPart,
                    meta: frontMatterPart.querySelector(this.selectors.bookPartMeta),
                    titleGroup: frontMatterPart.querySelector(this.selectors.titleGroup)
                } : null,
                namedBookPartBody: namedBookPartBody ? {
                    element: namedBookPartBody,
                    sections: Array.from(namedBookPartBody.querySelectorAll(this.selectors.sec))
                        .map(sec => ({
                            element: sec,
                            title: sec.querySelector(this.selectors.title)
                        }))
                } : null,
                toc: frontMatter.querySelector(this.selectors.toc),
                others: frontMatter.querySelector(this.selectors.others)
            }
        };
    },

    validateBookPart: function (bookPart) {
        const required = {
            meta: bookPart.querySelector(this.selectors.bookPartMeta),
            body: bookPart.querySelector(this.selectors.body),
            back: bookPart.querySelector(this.selectors.back)
        };

        return {
            isValid: Object.values(required).every(element => element !== null),
            missing: Object.entries(required)
                .filter(([_, element]) => element === null)
                .map(([key]) => key)
        };
    },

    validateBody: function (bodyElement) {
        if (!bodyElement) return {
            isValid: false,
            missing: ['body']
        };

        const hasContent =
            bodyElement.querySelector(this.selectors.figures) !== null ||
            bodyElement.querySelector(this.selectors.tables) !== null ||
            bodyElement.querySelector(this.selectors.sec) !== null;

        return {
            isValid: hasContent,
            missing: hasContent ? [] : ['figures/tables/sections']
        };
    },

    validateBack: function (backElement) {
        if (!backElement) return {
            isValid: false,
            missing: ['back']
        };

        const hasContent =
            backElement.querySelector(this.selectors.fnGroup) !== null ||
            backElement.querySelector(this.selectors.refList) !== null;

        return {
            isValid: hasContent,
            missing: hasContent ? [] : ['fn-group/ref-list']
        };
    },

    getBookBodyCollection: function () {
        const bookBody = this.globalDocBody.querySelector(this.selectors.bookBody);
        if (!bookBody) return null;

        return {
            element: bookBody,
            parts: Array.from(bookBody.querySelectorAll(this.selectors.bookPart)).map(part => {
                const validation = this.validateBookPart(part);
                const bodyValidation = this.validateBody(part.querySelector(this.selectors.body));
                const backValidation = this.validateBack(part.querySelector(this.selectors.back));

                return {
                    element: part,
                    isValid: validation.isValid && bodyValidation.isValid && backValidation.isValid,
                    validation: {
                        structure: validation,
                        body: bodyValidation,
                        back: backValidation
                    },
                    meta: part.querySelector(this.selectors.bookPartMeta),
                    body: this.getBodyContent(part.querySelector(this.selectors.body)),
                    back: this.getBackContent(part.querySelector(this.selectors.back))
                };
            })
        };
    },

    getBodyContent: function (bodyElement) {
        if (!bodyElement) return null;

        const figures = this.getFloatElements(bodyElement, this.selectors.figures);
        const tables = this.getFloatElements(bodyElement, this.selectors.tables);
        const sections = Array.from(bodyElement.querySelectorAll(this.selectors.sec)).map(sec => ({
            element: sec,
            title: sec.querySelector(this.selectors.title)
        }));

        return {
            element: bodyElement,
            hasContent: figures.length > 0 || tables.length > 0 || sections.length > 0,
            contentTypes: {
                hasFigures: figures.length > 0,
                hasTables: tables.length > 0,
                hasSections: sections.length > 0
            },
            figures,
            tables,
            sections
        };
    },

    getBackContent: function (backElement) {
        if (!backElement) return null;

        const footnotes = this.getFootnotes(backElement);
        const references = this.getReferences(backElement);

        return {
            element: backElement,
            hasContent: footnotes !== null || references !== null,
            contentTypes: {
                hasFootnotes: footnotes !== null,
                hasReferences: references !== null
            },
            footnotes,
            references
        };
    },

    getFootnotes: function (container) {
        const fnGroup = container.querySelector(this.selectors.fnGroup);
        if (!fnGroup) return null;

        const getLabel = (fn) => {
            const directLabel = fn.getAttribute('data-label');
            const nestedLabel = fn.querySelector("label") && fn.querySelector("label").textContent;
            return directLabel || nestedLabel || "";
        };

        const footnotes = Array.from(fnGroup.querySelectorAll(this.selectors.fn)).map(fn => {
            const label = getLabel(fn);
            return {
                element: fn,
                isLabeled: Boolean(label),
                label: label
            };
        });

        return {
            element: fnGroup,
            footnotes
        };
    },

    getReferences: function (container) {
        const refList = container.querySelector(this.selectors.refList);
        if (!refList) return null;

        return {
            element: refList,
            references: Array.from(refList.querySelectorAll(this.selectors.ref)).map(ref => ({
                element: ref,
                isLabeled: ref.hasAttribute('data-label'),
                label: ref.getAttribute('data-label')
            }))
        };
    },

    getFloatElements: function (container, selector) {
        return Array.from(container.querySelectorAll(selector)).map(float => ({
            element: float,
            caption: float.querySelector(this.selectors.caption),
            isLabeled: float.hasAttribute('data-label'),
            label: float.getAttribute('data-label')
        }));
    },

    validate: function () {
        const frontMatterCollection = this.getFrontMatterCollection();
        const bookBodyCollection = this.getBookBodyCollection();

        const frontMatterValidation = frontMatterCollection ? {
            isValid: frontMatterCollection.isValid,
            validation: frontMatterCollection.validation
        } : {
            isValid: false,
            validation: {
                missing: ['front-matter']
            }
        };

        const bookBodyValidation = bookBodyCollection ? {
            isValid: bookBodyCollection.parts.every(part => part.isValid),
            invalidParts: bookBodyCollection.parts.filter(part => !part.isValid)
                .map(part => ({
                    element: part.element,
                    validation: part.validation
                }))
        } : {
            isValid: false,
            validation: {
                missing: ['book-body']
            }
        };

        return {
            isValid: frontMatterValidation.isValid && bookBodyValidation.isValid,
            frontMatter: frontMatterValidation,
            bookBody: bookBodyValidation
        };
    }
};
class BooksReports {
    constructor(document) {
        this.collection = BITS_COLLECTION.init(document);
        this.frontMatter = this.collection.getFrontMatterCollection();
        this.bookBody = this.collection.getBookBodyCollection();
        this.validation = this.collection.validate();
    }

    getStructureReport() {
        return {
            isValid: this.validation.isValid,
            frontMatter: this.getFrontMatterReport(),
            bookBody: this.getBookBodyReport(),
            summary: this.getStructureSummary()
        };
    }

    getFrontMatterReport() {
        if (!this.frontMatter) {
            return {
                status: 'missing',
                error: 'Front matter section not found'
            };
        }


        const {
            parts
        } = this.frontMatter;
        const {
            frontMatterPart,
            namedBookPartBody,
            toc,
            others
        } = parts;

        return {
            status: this.frontMatter.isValid ? 'valid' : 'invalid',
            validation: this.frontMatter.validation,
            components: {
                frontMatterPart: {
                    exists: !!frontMatterPart,
                    hasMeta: !!frontMatterPart.meta || false,
                    hasTitleGroup: !!frontMatterPart.titleGroup || false
                },
                namedBookPartBody: {
                    exists: !!namedBookPartBody,
                    sectionCount: namedBookPartBody.sections.length || 0
                },
                toc: {
                    exists: !!toc
                },
                others: {
                    exists: !!others
                }
            }
        };
    }

    getBookBodyReport() {
        if (!this.bookBody) {
            return {
                status: 'missing',
                error: 'Book body section not found'
            };
        }
        const {
            parts
        } = this.bookBody;
        return {
            status: this.validation.bookBody.isValid ? 'valid' : 'invalid',
            partCount: this.bookBody.parts.length,
            parts: parts.map((part, index) => ({
                index: index + 1,
                isValid: part.isValid,
                validation: part.validation,
                components: {
                    meta: !!part.meta,
                    body: {
                        exists: !!part.body,
                        figures: part.body.figures.length || 0,
                        tables: part.body.tables.length || 0,
                        sections: part.body.sections.length || 0
                    },
                    back: {
                        exists: !!part.back,
                        hasFootnotes: !!part.back.footnotes,
                        hasReferences: !!part.back.references,
                        footnoteCount: part.back.footnotes.footnotes.length || 0,
                        referenceCount: part.back.references.references.length || 0
                    }
                }
            }))
        };
    }

    getLabelingReport() {
        return {
            figures: this.getFloatLabelingReport('figures'),
            tables: this.getFloatLabelingReport('tables'),
            footnotes: this.getFootnoteLabelingReport(),
            references: this.getReferenceLabelingReport(),
            summary: this.getLabelingSummary()
        };
    }

    getFloatLabelingReport(type) {
        const floats = this.bookBody.parts.flatMap(part =>
            part.body[type] || []);

        return {
            total: floats.length,
            labeled: floats.filter(item => item.isLabeled).length,
            unlabeled: floats.filter(item => !item.isLabeled).length,
            items: floats.map((item, index) => ({
                index: index + 1,
                isLabeled: item.isLabeled,
                label: item.label,
                hasCaption: !!item.caption
            }))
        };
    }

    getFootnoteLabelingReport() {
        const footnotes = this.bookBody.parts.flatMap(part =>
            part.back.footnotes && part.back.footnotes || []);

        return {
            total: footnotes.length,
            labeled: footnotes.filter(fn => fn.isLabeled).length,
            unlabeled: footnotes.filter(fn => !fn.isLabeled).length,
            items: footnotes.map((fn, index) => ({
                index: index + 1,
                isLabeled: fn.isLabeled,
                label: fn.label
            }))
        };
    }

    getReferenceLabelingReport() {
        const references = this.bookBody.parts.flatMap(part =>
            part.back && part.back.references || []);

        return {
            total: references.length,
            labeled: references.filter(ref => ref.isLabeled).length,
            unlabeled: references.filter(ref => !ref.isLabeled).length,
            items: references.map((ref, index) => ({
                index: index + 1,
                isLabeled: ref.isLabeled,
                label: ref.label
            }))
        };
    }

    getStructureSummary() {
        const frontMatterSections = this.frontMatter.parts.namedBookPartBody.sections.length || 0;
        const bookParts = this.bookBody.parts.length || 0;

        return {
            frontMatter: {
                sections: frontMatterSections,
                hasToc: !!this.frontMatter.parts.toc,
                hasOthers: !!this.frontMatter.parts.others
            },
            bookBody: {
                parts: bookParts,
                totalFigures: this.sumBookBodyItems('figures'),
                totalTables: this.sumBookBodyItems('tables'),
                totalFootnotes: this.sumBookBodyItems('footnotes'),
                totalReferences: this.sumBookBodyItems('references')
            }
        };
    }

    getLabelingSummary() {
        const figures = this.getFloatLabelingReport('figures');
        const tables = this.getFloatLabelingReport('tables');
        const footnotes = this.getFootnoteLabelingReport();
        const references = this.getReferenceLabelingReport();

        return {
            totalElements: figures.total + tables.total + footnotes.total + references.total,
            totalLabeled: figures.labeled + tables.labeled + footnotes.labeled + references.labeled,
            byType: {
                figures: {
                    total: figures.total,
                    labeled: figures.labeled,
                    percentage: this.calculatePercentage(figures.labeled, figures.total)
                },
                tables: {
                    total: tables.total,
                    labeled: tables.labeled,
                    percentage: this.calculatePercentage(tables.labeled, tables.total)
                },
                footnotes: {
                    total: footnotes.total,
                    labeled: footnotes.labeled,
                    percentage: this.calculatePercentage(footnotes.labeled, footnotes.total)
                },
                references: {
                    total: references.total,
                    labeled: references.labeled,
                    percentage: this.calculatePercentage(references.labeled, references.total)
                }
            }
        };
    }

    sumBookBodyItems(type) {
        return this.bookBody.parts.reduce((sum, part) => {
            if (type === 'footnotes') {
                return sum + (part.back.footnotes.footnotes.length || 0);
            }
            if (type === 'references') {
                return sum + (part.back.references.references.length || 0);
            }
            return sum + (part.body[type].length || 0);
        }, 0) || 0;
    }

    calculatePercentage(value, total) {
        return total === 0 ? 0 : ((value / total) * 100).toFixed(1);
    }
}

export default BooksReports;