import { ClockImplement } from "../../../infrastructure/clock/clock.implement";

describe("ClockImplement", () => {
  let clock: ClockImplement;

  beforeEach(() => {
    clock = new ClockImplement();
  });

  it("should return ISO string in Ecuador time (UTC-5) regardless of server timezone", () => {
    // Fix a known UTC time: 2024-03-15T15:00:00Z → Ecuador: 2024-03-15T10:00:00-05:00
    jest.spyOn(Date, "now").mockReturnValue(new Date("2024-03-15T15:00:00Z").getTime());

    const result = clock.nowISO();

    expect(result).toBe("2024-03-15T10:00:00-05:00");

    jest.restoreAllMocks();
  });

  it("should always end with -05:00", () => {
    const result = clock.nowISO();
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00/);
  });

  it("should produce correct Ecuador time when server is UTC+2", () => {
    // UTC+2 server: 2024-06-20T09:00:00Z → Ecuador: 2024-06-20T04:00:00-05:00
    jest.spyOn(Date, "now").mockReturnValue(new Date("2024-06-20T09:00:00Z").getTime());

    const result = clock.nowISO();

    expect(result).toBe("2024-06-20T04:00:00-05:00");

    jest.restoreAllMocks();
  });
});
