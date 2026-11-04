import {
  isMusicXmlUploadFile,
  looksLikeMusicXml,
  metadataFromMusicXml,
} from "@/domains/songs/musicXmlMetadata";
import { extractInstrumentsFromXml } from "@/study/studyUtils";

type MusicXmlUploadResult =
  | {
      ok: true;
      dataUrl: string;
      fileName: string;
      mimeType: string;
      metadata: ReturnType<typeof metadataFromMusicXml>;
    }
  | { ok: false; message: string };

export async function prepareMusicXmlUpload(
  file: File,
): Promise<MusicXmlUploadResult> {
  if (!isMusicXmlUploadFile(file)) {
    return {
      ok: false,
      message:
        "Formato não aceito. Envie apenas MusicXML (.xml ou .musicxml). Exporte a partitura como MusicXML e tente novamente.",
    };
  }
  try {
    const content = await file.text();
    if (!looksLikeMusicXml(content)) {
      return {
        ok: false,
        message:
          "O arquivo não parece ser MusicXML válido. Confira a exportação e tente novamente.",
      };
    }
    if (extractInstrumentsFromXml(content).length === 0) {
      return {
        ok: false,
        message:
          "A partitura não define naipes utilizáveis. Exporte como MusicXML partwise com a lista de instrumentos.",
      };
    }
    const mimeType = file.type || "application/xml";
    return {
      ok: true,
      dataUrl: `data:${mimeType};base64,${btoa(unescape(encodeURIComponent(content)))}`,
      fileName: file.name,
      mimeType,
      metadata: metadataFromMusicXml(content),
    };
  } catch {
    return {
      ok: false,
      message:
        "Não foi possível ler a partitura. Confira o arquivo e tente novamente.",
    };
  }
}
