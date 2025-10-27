// tests/setupTests.js
import { jest } from "@jest/globals";

process.env.NODE_ENV = "test";
process.env.SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || ":memory:";
process.env.OPENAI_API_KEY = "test-key"; // silence console error from ai.js


jest.setTimeout(15000);
