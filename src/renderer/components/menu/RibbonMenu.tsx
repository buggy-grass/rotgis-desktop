import React from 'react'
import { makeUseStyles } from '../../styles/makeUseStyles'

const useStyles = makeUseStyles({
    container: {
        width: "100%",
        height: "200px"
    }
})

function RibbonMenu() {
    const styles = useStyles()
  return (
    <div className='border-b border-border' style={styles.container}>
      
    </div>
  )
}

export default RibbonMenu
