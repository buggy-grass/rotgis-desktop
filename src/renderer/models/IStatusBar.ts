export default interface IStatusBar {
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  operation: {
    name: string;
    icon?: string;
  };
}

