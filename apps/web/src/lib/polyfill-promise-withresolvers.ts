// Polyfill de Promise.withResolvers (ES2024).
//
// pdfjs-dist v5.x lo usa en runtime y NO existe en Safari < 17.4, navegadores
// antiguos ni varios WebView móviles — sin esto el visor PDF revienta con
// "TypeError: Promise.withResolvers is not a function".
//
// Se importa como EFECTO SECUNDARIO y como PRIMER import en visor-pdf.tsx: los
// imports ESM se evalúan en orden, así el método ya existe cuando react-pdf /
// pdfjs-dist se inicializan.
//
// El tsconfig usa lib ES2022 (sin este tipo), por eso se castea el constructor
// en vez de depender de la definición de lib.ES2024.

type WithResolvers = <T>() => {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

const PromiseCtor = Promise as PromiseConstructor & { withResolvers?: WithResolvers }

if (typeof PromiseCtor.withResolvers !== 'function') {
  PromiseCtor.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}
