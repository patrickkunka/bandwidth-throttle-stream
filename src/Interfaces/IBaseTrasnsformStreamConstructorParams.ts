interface IBaseTransformStreamConstructorParams {
    transform: (chunk: Uint8Array) => Promise<void> | void;
    flush: () => Promise<void> | void;
}

export default IBaseTransformStreamConstructorParams;
