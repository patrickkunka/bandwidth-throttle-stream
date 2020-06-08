class BaseTransformStream extends TransformStream<Uint8Array, Uint8Array> {
    private controller: TransformStreamDefaultController<
        Uint8Array
    > | null = null;

    constructor({transform, flush}) {
        super({
            transform: (chunk, controller) => {
                this.controller = controller;

                transform(chunk);
            },
            flush
        });
    }

    protected push(chunk: Uint8Array): void {
        this.controller.enqueue(chunk);
    }
}

export default BaseTransformStream;
