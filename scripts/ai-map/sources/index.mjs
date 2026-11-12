import * as huggingface from "./huggingface.mjs";
import * as github from "./github.mjs";
import * as epochModels from "./epoch-models.mjs";
import * as epochCompanies from "./epoch-companies.mjs";
import * as epochChips from "./epoch-chips.mjs";
import * as secEdgar from "./sec-edgar.mjs";
import * as wikidata from "./wikidata.mjs";
import * as openalex from "./openalex.mjs";

// Order matters only for logs. Every source is deterministic: same inputs, same outputs, no AI involved.
export const sources = [huggingface, github, epochModels, epochCompanies, epochChips, secEdgar, wikidata, openalex];
export const sourceById = Object.fromEntries(sources.map((source) => [source.id, source]));
