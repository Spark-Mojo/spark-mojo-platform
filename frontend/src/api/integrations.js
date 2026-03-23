// Integration stubs — Base44/Supabase integrations replaced with Frappe-compatible stubs.
// These preserve the exact function signatures so consuming files don't break.
// Real implementations will be wired to Frappe satellite services in Phase 2+.

function stub(name) {
  return async (...args) => {
    console.warn(`[Integration Stub] ${name} called but not yet connected to Frappe backend.`, args);
    return { success: false, stub: true, message: `${name} is not yet implemented` };
  };
}

export const InvokeLLM = stub('InvokeLLM');
export const OCR = stub('OCR');
export const SendEmail = stub('SendEmail');
export const UploadFile = stub('UploadFile');
export const GenerateImage = stub('GenerateImage');
export const ExtractDataFromUploadedFile = stub('ExtractDataFromUploadedFile');
export const CreateFileSignedUrl = stub('CreateFileSignedUrl');
export const UploadPrivateFile = stub('UploadPrivateFile');

export const Core = {
  InvokeLLM,
  OCRFile: OCR,
  SendEmail,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
  CreateFileSignedUrl,
  UploadPrivateFile,
};
