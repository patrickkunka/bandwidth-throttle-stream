import IConfig from './Interfaces/IConfig';

class Config implements IConfig {
    public bytesPerSecond: number = Infinity;
    public resolutionHz: number = 40;

    public get isThrottled() {
        return this.bytesPerSecond < Infinity;
    }

    public get tickDurationMs(): number {
        return 1000 / this.resolutionHz;
    }
}

export default Config;
