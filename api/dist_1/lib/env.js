"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
exports.mustGet = mustGet;
function mustGet(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing env var: ${name}`);
    return v;
}
exports.ENV = {
    DATABRICKS_HOST: mustGet("DATABRICKS_HOST"),
    DATABRICKS_TOKEN: mustGet("DATABRICKS_TOKEN"),
    DATABRICKS_WAREHOUSE_ID: mustGet("DATABRICKS_WAREHOUSE_ID"),
    DATABRICKS_CATALOG: process.env.DATABRICKS_CATALOG ?? "Hackathon2",
    DATABRICKS_SCHEMA: process.env.DATABRICKS_SCHEMA ?? "amer",
    AZURE_OPENAI_ENDPOINT: mustGet("AZURE_OPENAI_ENDPOINT"),
    AZURE_OPENAI_KEY: mustGet("AZURE_OPENAI_KEY"),
    AZURE_OPENAI_DEPLOYMENT: mustGet("AZURE_OPENAI_DEPLOYMENT"),
    AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION ?? "2024-04-01-preview"
};
