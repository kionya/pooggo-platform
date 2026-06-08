import { describe, it, expect } from "vitest";
import { parseHospitalIds } from "./ids";

describe("parseHospitalIds", () => {
  it("단일", () => expect(parseHospitalIds({ hospital: "h1" })).toEqual(["h1"]));
  it("다중 콤마", () => expect(parseHospitalIds({ hospitals: "a,b,c" })).toEqual(["a", "b", "c"]));
  it("최대 3개로 제한", () => expect(parseHospitalIds({ hospitals: "a,b,c,d,e" })).toEqual(["a", "b", "c"]));
  it("공백·빈값 제거", () => expect(parseHospitalIds({ hospitals: " a , ,b " })).toEqual(["a", "b"]));
  it("중복 제거", () => expect(parseHospitalIds({ hospitals: "a,a,b" })).toEqual(["a", "b"]));
  it("둘 다 없으면 빈배열", () => expect(parseHospitalIds({})).toEqual([]));
  it("hospital 우선 + hospitals 병합", () => expect(parseHospitalIds({ hospital: "x", hospitals: "y,z" })).toEqual(["x", "y", "z"]));
});
