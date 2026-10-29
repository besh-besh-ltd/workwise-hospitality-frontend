// A tender is never narrowed by RFQ coverage: its process may be of any type
// and coverage only describes RFQ workflows.
import { usableRfqProcesses, processFieldState, nextProcessId } from "./policyCoverage";

const processes = [
  { value: 1, label: "Day to Day", process_type: "RFQ" },
  { value: 2, label: "Tender flow", process_type: "TENDER" },
];
// Only process 1 has an RFQ policy; the tender process 2 has a TENDER policy.
const coverage = { process_free: [], by_process: { 1: ["RFQ"], 2: ["TENDER"] } };
const tender = { isTender: true };

test("RFQ drafts are still narrowed to RFQ-type processes with RFQ coverage", () => {
  expect(usableRfqProcesses(processes, coverage).map((p) => p.value)).toEqual([1]);
});

test("a tender keeps every process, whatever its type or coverage", () => {
  expect(usableRfqProcesses(processes, coverage, tender).map((p) => p.value)).toEqual([1, 2]);
});

test("a tender always gets the required select, even with no usable RFQ process", () => {
  expect(processFieldState([], coverage, tender)).toBe("select");
  expect(processFieldState([processes[0]], coverage, tender)).toBe("select");
  expect(processFieldState([processes[0]], coverage)).toBe("readonly");
});

test("a tender is never auto-switched onto an RFQ process", () => {
  // Without isTender the lone usable RFQ process would be forced in.
  expect(nextProcessId(2, [processes[0]], coverage)).toBe(1);
  expect(nextProcessId(2, processes, coverage, tender)).toBe(2);
  expect(nextProcessId(null, [processes[0]], coverage, tender)).toBe(null);
});
