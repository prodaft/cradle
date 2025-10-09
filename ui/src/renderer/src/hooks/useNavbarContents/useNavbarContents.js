import { useContext, useEffect } from 'react';
import { OutletContext } from '../../components/TabsContainer/TabsContainer';

/**
 * useNavbarContents hook - sets the contents of the navbar
 * Other components can use this hook to set the contents of the navbar
 * When the component is unmounted, the contents are cleared
 *
 * @param {Array<React.ReactComponent>} contents - the contents to set in the navbar
 * @param {Array<any>} dependencies - the dependencies for the effect (Set to something from the component
 *                       that uses the hook to avoid errors with React trying to
 *                       render multiple components simultaneously)
 */
const useNavbarContents = (contents, dependencies) => {
    // Use our custom outlet context from TabsContainer
    const context = useContext(OutletContext) || {};
    const { setNavbarContents } = context;

    return useEffect(() => {
        if (!setNavbarContents) return;
        
        if (contents instanceof Function) {
            setNavbarContents(contents());
        } else {
            setNavbarContents([contents]);
        }

        return () => {
            if (setNavbarContents) {
                setNavbarContents([]);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setNavbarContents, ...dependencies]);
};

export default useNavbarContents;
