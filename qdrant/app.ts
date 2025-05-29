import {encureColllection, printCollections} from "./vector.store.ts";

const COLLECTION_NAME = "playground"

await printCollections()
await encureColllection(COLLECTION_NAME)
await printCollections()