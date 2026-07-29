import { beforeEach, describe } from "vitest"
import { runGraphRepositoryContractTests } from "../contract/repositoryContractTests"
import { LocalStorageRepository } from "./LocalStorageRepository"

describe("LocalStorageRepository Contract", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  runGraphRepositoryContractTests(() => {
    return new LocalStorageRepository()
  })
})
