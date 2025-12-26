export default interface IAppState {
  appName: string;
  projectName: string;
  isLoading: boolean;
  loadingProgress: {
    percentage: number;
    message: string;
  };
}

