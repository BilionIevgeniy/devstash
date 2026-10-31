import { describe, expect, it } from "vitest";

import {
  acceptedExtensions,
  checkDeclaredFile,
  contentDisposition,
  contentTypeFor,
  DOWNLOAD_WINDOW_SECONDS,
  fileExtension,
  fileIconKind,
  formatFileSize,
  isUserKey,
  objectKey,
  signingWindowFor,
  UNSUPPORTED_FILE_MESSAGE,
  viewDisposition,
} from "@/features/files/domain/file-rules";

const MB = 1024 * 1024;

describe("fileExtension", () => {
  it("takes the last extension, in lower case", () => {
    expect(fileExtension("Report.Final.PDF")).toBe("pdf");
  });

  it("gives an empty string for a name without a dot", () => {
    expect(fileExtension("Makefile")).toBe("");
  });
});

describe("fileIconKind", () => {
  it.each([
    ["manual.pdf", "pdf"],
    ["README.MD", "text"],
    ["config.yml", "code"],
    ["data.csv", "spreadsheet"],
    ["Makefile", "other"],
    ["archive.zip", "other"],
  ])("%s gets the %s icon", (fileName, expected) => {
    expect(fileIconKind(fileName)).toBe(expected);
  });

  it("has a specific icon for every extension a file upload accepts", () => {
    const extensions = acceptedExtensions("file").split(",");

    for (const extension of extensions) {
      expect(fileIconKind(`a${extension}`), extension).not.toBe("other");
    }
  });
});

describe("contentTypeFor", () => {
  it("maps the extension, whatever the case", () => {
    expect(contentTypeFor("image", "photo.JPG")).toBe("image/jpeg");
  });

  it("stores .ini as plain text and .yml as YAML", () => {
    expect(contentTypeFor("file", "settings.ini")).toBe("text/plain");
    expect(contentTypeFor("file", "ci.yml")).toBe("application/x-yaml");
  });

  it("does not accept a file extension for an image or the other way round", () => {
    expect(contentTypeFor("image", "doc.pdf")).toBeNull();
    expect(contentTypeFor("file", "photo.png")).toBeNull();
  });
});

describe("checkDeclaredFile", () => {
  it("accepts an image of exactly 5 MB", () => {
    expect(checkDeclaredFile("image", "a.png", 5 * MB)).toEqual({
      contentType: "image/png",
    });
  });

  it("rejects an image one byte over 5 MB", () => {
    expect(checkDeclaredFile("image", "a.png", 5 * MB + 1)).toHaveProperty(
      "error",
    );
  });

  it("allows files up to 10 MB", () => {
    expect(checkDeclaredFile("file", "a.pdf", 10 * MB)).toHaveProperty(
      "contentType",
    );
    expect(checkDeclaredFile("file", "a.pdf", 10 * MB + 1)).toHaveProperty(
      "error",
    );
  });

  it("rejects an unsupported extension and an empty file", () => {
    expect(checkDeclaredFile("file", "run.exe", 10)).toEqual({
      error: UNSUPPORTED_FILE_MESSAGE,
    });
    expect(checkDeclaredFile("file", "a.txt", 0)).toHaveProperty("error");
  });
});

describe("formatFileSize", () => {
  it("picks the unit and keeps one decimal only for small values", () => {
    expect(formatFileSize(980)).toBe("980 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(5 * MB)).toBe("5.0 MB");
    expect(formatFileSize(150 * 1024)).toBe("150 KB");
  });
});

describe("isUserKey", () => {
  const key = objectKey("abc", "id-1", "png");

  it("accepts a key the user's own objectKey built", () => {
    expect(isUserKey("abc", key)).toBe(true);
  });

  it("rejects another user's key", () => {
    expect(isUserKey("xyz", key)).toBe(false);
  });

  it("rejects a user id that only starts the same", () => {
    expect(isUserKey("ab", key)).toBe(false);
    expect(isUserKey("abc", "users/abcd/id-1.png")).toBe(false);
  });

  it("rejects a deeper path and the bare prefix", () => {
    expect(isUserKey("abc", "users/abc/x/id-1.png")).toBe(false);
    expect(isUserKey("abc", "users/abc/")).toBe(false);
  });
});

describe("signingWindowFor", () => {
  it("signs every moment of a window at its start", () => {
    const early = signingWindowFor(new Date("2026-10-30T10:00:05Z"));
    const late = signingWindowFor(new Date("2026-10-30T10:59:59Z"));
    expect(early.signingDate).toEqual(new Date("2026-10-30T10:00:00Z"));
    expect(late.signingDate).toEqual(early.signingDate);
  });

  it("stays valid for at least one full window after any render", () => {
    const now = new Date("2026-10-30T10:59:59Z");
    const { signingDate, expiresIn } = signingWindowFor(now);
    const expiresAt = signingDate.getTime() + expiresIn * 1000;
    expect(expiresAt - now.getTime()).toBeGreaterThanOrEqual(
      DOWNLOAD_WINDOW_SECONDS * 1000,
    );
  });
});

describe("viewDisposition", () => {
  it("downloads an SVG instead of opening it as a page", () => {
    expect(viewDisposition("users/u1/abc.svg")).toBe("attachment");
    expect(viewDisposition("users/u1/abc.SVG")).toBe("attachment");
  });

  it("opens other images and files inline", () => {
    expect(viewDisposition("users/u1/abc.png")).toBe("inline");
    expect(viewDisposition("users/u1/abc.pdf")).toBe("inline");
  });
});

describe("contentDisposition", () => {
  it("quotes a plain name as is", () => {
    expect(contentDisposition("attachment", "notes.md")).toBe(
      `attachment; filename="notes.md"; filename*=UTF-8''notes.md`,
    );
  });

  it("keeps quotes and non-ASCII out of the quoted fallback", () => {
    const header = contentDisposition("inline", 'Отчёт "v2".pdf');
    expect(header).toContain('filename="_____ _v2_.pdf"');
    expect(header).toContain(
      "filename*=UTF-8''%D0%9E%D1%82%D1%87%D1%91%D1%82%20%22v2%22.pdf",
    );
  });

  it("never lets a line break into the header", () => {
    expect(contentDisposition("inline", "a\r\nb.txt")).not.toMatch(/[\r\n]/);
  });
});
