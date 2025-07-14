import {extractResources} from "./extract-resources.ts";

console.log("Unknown News project started!");
extractResources().then(r => console.log(r));