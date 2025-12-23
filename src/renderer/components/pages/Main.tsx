import React, { useEffect } from 'react';
import { WindowCustomBar } from '../WindowCustomBar';
import { Button } from '../ui/button';
import PotreeViewer from '../viewer/PotreeViewer';
import HeightProfileViewer from '../viewer/HeightProfileViewer';
import StatusBar from '../StatusBar';
import RibbonMenu from '../menu/RibbonMenu';

const useStyles = {
    container:{

    }
}

function Main() {
    const styles = useStyles;
    const [viewer, setViewer] = React.useState<any>(true);

    useEffect(()=>{
        console.error("loaded",window.viewer);
    },[window.viewer])

  return (
    <div style={styles.container}>
      <WindowCustomBar />
      <RibbonMenu/>
      <div style={{ height: "calc(100vh - 252px)", width: "100vw", position: "relative" }}>
        <Button style={{position:"absolute"}} onClick={() => setViewer(true)}>Open Viewer</Button>
        {viewer && <PotreeViewer display="block" />}
        {<HeightProfileViewer display="none" />}
      </div>
      <StatusBar />
    </div>
  )
}

export default Main;
