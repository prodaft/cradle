import { createDashboardLink } from "./dashboardUtils";

describe("createDashboardLink", () => {
    it("should return an empty string if entity is falsy", () => {
        expect(createDashboardLink(null)).toBe("");
        expect(createDashboardLink(undefined)).toBe("");
        expect(createDashboardLink(false)).toBe("");
        expect(createDashboardLink(0)).toBe("");
        expect(createDashboardLink("")).toBe("");
    });

    it("should create a dashboard link with encoded name and type when subtype is not provided", () => {
        const entity = {
            name: "Case A",
            type: "case",
        };
        const expectedLink = "/dashboards/cases/Case%20A/";
        expect(createDashboardLink(entity)).toBe(expectedLink);
    });

    it("should create a dashboard link with encoded name, type, and subtype when subtype is provided", () => {
        const entity = {
            name: "127.0.0.1",
            type: "entry",
            subtype: "ip",
        };
        const expectedLink = "/dashboards/entries/127.0.0.1?subtype=ip";
        expect(createDashboardLink(entity)).toBe(expectedLink);
    });
});
