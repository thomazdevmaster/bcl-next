// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { prepareMusicXmlUpload } from "./prepareMusicXmlUpload";

function fileWithText(name: string, content: string, type = "application/xml") {
  return new File([content], name, { type });
}

function utf16LeBytes(content: string): Uint8Array {
  const bytes = new Uint8Array(content.length * 2);
  for (let i = 0; i < content.length; i += 1) {
    const code = content.charCodeAt(i);
    bytes[i * 2] = code & 0xff;
    bytes[i * 2 + 1] = code >> 8;
  }
  return bytes;
}

describe("prepareMusicXmlUpload", () => {
  it("encodes a MusicXML file with a usable part", async () => {
    const file = fileWithText(
      "hino.musicxml",
      "<score-partwise><part-list><score-part id='P1'><part-name>Flute</part-name></score-part></part-list></score-partwise>",
    );

    await expect(prepareMusicXmlUpload(file)).resolves.toMatchObject({
      ok: true,
      fileName: "hino.musicxml",
      mimeType: "application/xml",
      dataUrl: expect.stringMatching(/^data:application\/xml;base64,/),
    });
  });

  it("accepts MusicXML exported as UTF-16 without BOM (Encore)", async () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-16"?>\n' +
      '<score-partwise version="1.1">' +
      "<part-list><score-part id='P1'><part-name>Baixo sib</part-name></score-part></part-list>" +
      "</score-partwise>";
    const file = new File([utf16LeBytes(xml)], "Linda Demais.xml", {
      type: "application/xml",
    });

    const result = await prepareMusicXmlUpload(file);
    expect(result).toMatchObject({ ok: true, fileName: "Linda Demais.xml" });
    if (result.ok) {
      const decoded = decodeURIComponent(
        escape(atob(result.dataUrl.replace(/^data:[^;]+;base64,/, ""))),
      );
      expect(decoded).toContain('encoding="UTF-8"');
      expect(decoded).toContain("<score-partwise");
      expect(decoded).not.toMatch(/\u0000/);
    }
  });

  it("returns clear errors for unsupported and unusable files", async () => {
    await expect(
      prepareMusicXmlUpload(fileWithText("foto.txt", "plain text", "text/plain")),
    ).resolves.toMatchObject({ ok: false, message: expect.stringContaining("Formato não aceito") });
    await expect(
      prepareMusicXmlUpload(fileWithText("score.xml", "<html />")),
    ).resolves.toMatchObject({ ok: false, message: expect.stringContaining("não parece ser MusicXML") });
    await expect(
      prepareMusicXmlUpload(fileWithText("score.xml", "<score-partwise><part-list /></score-partwise>")),
    ).resolves.toMatchObject({ ok: false, message: expect.stringContaining("não define naipes") });
  });
});
