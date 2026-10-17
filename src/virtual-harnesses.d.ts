declare module 'virtual:harnesses' {
  export const harnesses: import('../catalog/schema.ts').Harness[]
  export const lastUpdated: string
}
