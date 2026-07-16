import { describe, it, expect } from "vitest";
import {
  classifyContentType,
  validateMediaUpload,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "./media.server";

describe("classifyContentType", () => {
  it("classifies allowed image types", () => {
    expect(classifyContentType("image/jpeg")).toBe("image");
    expect(classifyContentType("image/png")).toBe("image");
    expect(classifyContentType("image/webp")).toBe("image");
    expect(classifyContentType("image/gif")).toBe("image");
  });

  it("classifies allowed video types", () => {
    expect(classifyContentType("video/mp4")).toBe("video");
    expect(classifyContentType("video/quicktime")).toBe("video");
  });

  it("returns null for unsupported types", () => {
    expect(classifyContentType("application/pdf")).toBeNull();
    expect(classifyContentType("image/svg+xml")).toBeNull();
    expect(classifyContentType("")).toBeNull();
  });
});

describe("validateMediaUpload", () => {
  it("accepts an image under the size cap", () => {
    const result = validateMediaUpload("image/png", MAX_IMAGE_BYTES - 1);
    expect(result).toEqual({ ok: true, type: "image" });
  });

  it("accepts a video under the size cap", () => {
    const result = validateMediaUpload("video/mp4", MAX_VIDEO_BYTES - 1);
    expect(result).toEqual({ ok: true, type: "video" });
  });

  it("rejects an image over the image size cap", () => {
    const result = validateMediaUpload("image/png", MAX_IMAGE_BYTES + 1);
    expect(result).toEqual({ ok: false, error: "image_too_large" });
  });

  it("rejects a video over the video size cap", () => {
    const result = validateMediaUpload("video/mp4", MAX_VIDEO_BYTES + 1);
    expect(result).toEqual({ ok: false, error: "video_too_large" });
  });

  it("rejects an unsupported content type", () => {
    const result = validateMediaUpload("application/pdf", 1000);
    expect(result).toEqual({ ok: false, error: "unsupported_content_type" });
  });

  it("rejects zero or negative size", () => {
    expect(validateMediaUpload("image/png", 0)).toEqual({ ok: false, error: "invalid_size" });
    expect(validateMediaUpload("image/png", -5)).toEqual({ ok: false, error: "invalid_size" });
  });

  it("rejects non-finite size", () => {
    expect(validateMediaUpload("image/png", NaN)).toEqual({ ok: false, error: "invalid_size" });
    expect(validateMediaUpload("image/png", Infinity)).toEqual({ ok: false, error: "invalid_size" });
  });
});
