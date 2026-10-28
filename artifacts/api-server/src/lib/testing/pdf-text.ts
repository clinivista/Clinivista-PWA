// Solo para tests: lee el texto que Helvetica dibuja en cada página de un PDF hecho con pdf-lib (cadenas hex en orden).
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream, type PDFStream } from "pdf-lib";

export async function pagesText(pdf: Buffer | Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(pdf);
  return doc.getPages().map((page) => {
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray().map((ref) => doc.context.lookup(ref) as PDFStream) : contents ? [contents] : [];
    let raw = "";
    for (const stream of streams) {
      const bytes = stream instanceof PDFRawStream ? decodePDFRawStream(stream).decode() : (stream as unknown as { getContents(): Uint8Array }).getContents();
      raw += Buffer.from(bytes).toString("latin1");
    }
    return [...raw.matchAll(/<([0-9A-Fa-f]*)>\s*Tj/g)].map((match) => Buffer.from(match[1], "hex").toString("latin1")).join(" ");
  });
}

export const pdfText = async (pdf: Buffer | Uint8Array) => (await pagesText(pdf)).join(" \n ");
