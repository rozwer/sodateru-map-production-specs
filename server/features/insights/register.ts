import {defineFeature} from "../../core/features.ts";
import {migration} from "./migration.ts";

// Storage adapter delivery. HTTP/AI wiring follows INFORMATION integration.
export default defineFeature({id:"insights",migrations:[migration],register(){}});
