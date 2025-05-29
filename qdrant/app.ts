import {encureColllection, printCollections} from "./vectore.store.ts";

const COLLECTION_NAME = "playground"

await printCollections()
await encureColllection(COLLECTION_NAME)
await printCollections()