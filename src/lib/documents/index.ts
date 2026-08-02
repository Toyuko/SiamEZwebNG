export { assertCanAttachDocumentToCase } from "./authz";

export {
  WIZARD_DOCUMENT_MAX_BYTES,
  isAllowedWizardDocument,
  validateWizardDocument,
} from "./validate";

export {
  MockOcrProvider,
  EnvOcrProvider,
  resolveOcrProvider,
  extractDocumentFields,
  type ExtractInput,
  type ExtractResult,
  type ExtractedFieldMap,
  type OcrProvider,
} from "./extract";

export {
  getMissingDocuments,
  formatMissingDocumentWarning,
  type UploadedDocumentRef,
  type MissingDocumentResult,
} from "./missing";

export {
  extractedFieldsToWizardPrefill,
  applyWizardPrefill,
  type PrefillOptions,
  type PrefillPatch,
} from "./prefill";
