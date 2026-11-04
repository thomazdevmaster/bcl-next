// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { prepareMusicXmlUpload } from "./prepareMusicXmlUpload";

function fileWithText(name: string, content: string, type = "application/xml") {
  const file = new File([content], name, { type });
  Object.defineProperty(file, "text", { value: async () => content });
  return file;
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
