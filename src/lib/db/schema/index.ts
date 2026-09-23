export * from "./auth.schema";
// export your others here
export * from "./clinic.schema";
export * from "./enums";
export * from "./types";

import * as auth from "./auth.schema";
import * as clinic from "./clinic.schema";
export const schema = {
	...auth,
	...clinic
};
