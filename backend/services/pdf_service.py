import io
import pdfplumber

def extract_text_from_pdf(file_content: bytes) -> str:
    """
    Extracts text from a PDF file content (bytes) using pdfplumber.
    """
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
            if not text.strip():
                with open("pdf_errors.log", "a") as f:
                    f.write("Warning: Extracted text is empty.\n")
            
            return text
    except Exception as e:
        error_msg = f"Error extracting text from PDF: {e}"
        print(error_msg)
        with open("pdf_errors.log", "a") as f:
            f.write(error_msg + "\n")
        return ""
