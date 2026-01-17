export default interface IStatusBar {
  pointCloudData: {
    id: string;
    name: string,
    epsg: string
   };
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

