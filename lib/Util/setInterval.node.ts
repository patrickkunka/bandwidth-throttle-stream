type SetIntervalParameters = Parameters<typeof global['setInterval']>;

const setInterval = (
    callback: SetIntervalParameters[0],
    ms: SetIntervalParameters[1],
    ...args: SetIntervalParameters[2]
) => global.setInterval(callback, ms, ...args);

export default setInterval;
