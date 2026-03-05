declare module 'html2pdf.js' {
  type Html2PdfOptions = {
    margin?: number | [number, number] | [number, number, number, number];
    pagebreak?: {
      mode?: string[];
      before?: string | string[];
      after?: string | string[];
      avoid?: string | string[];
    };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      backgroundColor?: string;
    };
    jsPDF?: {
      unit?: string;
      format?: string | number[];
      orientation?: 'portrait' | 'landscape' | string;
      compress?: boolean;
    };
  };

  type Html2PdfWorker = {
    set: (options: Html2PdfOptions) => Html2PdfWorker;
    from: (element: Element) => Html2PdfWorker;
    outputPdf: (type: 'blob' | 'arraybuffer' | 'datauristring') => Promise<Blob | ArrayBuffer | string>;
  };

  export default function html2pdf(): Html2PdfWorker;
}
