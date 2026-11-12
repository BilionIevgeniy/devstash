import { describe, expect, it } from "vitest";

import {
  emptyFormValues,
  formValues,
} from "@/features/auth/_internal/domain/form-values";

describe("formValues", () => {
  it("reads the named fields and leaves out the others", () => {
    const formData = new FormData();
    formData.set("password", "secret-1");
    formData.set("confirmPassword", "secret-2");
    formData.set("csrf", "ignored");

    expect(formValues(formData, ["password", "confirmPassword"])).toEqual({
      password: "secret-1",
      confirmPassword: "secret-2",
    });
  });

  it("reads a missing field as empty text, not as 'null'", () => {
    expect(formValues(new FormData(), ["password"])).toEqual({ password: "" });
  });

  it("reads a file as empty text", () => {
    const formData = new FormData();
    formData.set("password", new File(["x"], "x.txt"));

    expect(formValues(formData, ["password"])).toEqual({ password: "" });
  });

  it("keeps leading and trailing spaces, since a password may have them", () => {
    const formData = new FormData();
    formData.set("password", "  spaced  ");

    expect(formValues(formData, ["password"])).toEqual({
      password: "  spaced  ",
    });
  });
});

describe("emptyFormValues", () => {
  it("has an empty text for every named field", () => {
    expect(emptyFormValues(["name", "email"])).toEqual({ name: "", email: "" });
  });
});
