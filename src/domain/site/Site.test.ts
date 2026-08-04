import { describe, it, expect } from "vitest";
import { isActive, groupByKoushu, groupByKoutei, Photo, Site } from "./Site";

const site = (archivedAt?: string): Site => ({
  id: "s1",
  companyId: "c1",
  name: "現場",
  createdAt: "2026-01-01T00:00:00Z",
  archivedAt,
});

const photo = (koushu: string, koutei: Photo["koutei"], id: string): Photo => ({
  id,
  siteId: "s1",
  koushu,
  koutei,
  shotAt: "2026-01-01T00:00:00Z",
  filePath: `s1/${id}.jpg`,
  createdAt: "2026-01-01T00:00:00Z",
});

describe("isActive", () => {
  it("archivedAtが無ければ稼働中", () => {
    expect(isActive(site())).toBe(true);
  });
  it("archivedAtがあればアーカイブ済み", () => {
    expect(isActive(site("2026-02-01T00:00:00Z"))).toBe(false);
  });
});

describe("groupByKoushu", () => {
  it("工種ごとにまとめ、初出順を保つ", () => {
    const photos = [photo("外部足場", "着手前", "p1"), photo("内装", "着手前", "p2"), photo("外部足場", "施工中", "p3")];
    const groups = groupByKoushu(photos);
    expect(groups.map((g) => g.koushu)).toEqual(["外部足場", "内装"]);
    expect(groups[0].photos.map((p) => p.id)).toEqual(["p1", "p3"]);
  });
});

describe("groupByKoutei", () => {
  it("着手前→完了検査の順で、写真がある工程だけ返す", () => {
    const photos = [photo("外部足場", "完了検査", "p1"), photo("外部足場", "着手前", "p2")];
    const groups = groupByKoutei(photos);
    expect(groups.map((g) => g.koutei)).toEqual(["着手前", "完了検査"]);
  });
});
