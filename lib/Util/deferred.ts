interface IDeferred<T> extends Promise<T> {
    resolve: (value?: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
}

const deferred = <T>(): IDeferred<T> => {
    let methods: {
        resolve: IDeferred<T>['resolve'];
        reject: IDeferred<T>['reject'];
    };

    const promise = new Promise<T>((resolve, reject): void => {
        methods = {resolve, reject};
    });

    return Object.assign(promise, methods!);
};

export {deferred as default, IDeferred};
