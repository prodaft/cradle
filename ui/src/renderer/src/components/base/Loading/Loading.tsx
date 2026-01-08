import Logo from '../Logo/Logo';
import { Spinner } from '@/components/ui/spinner';

interface LoadingProps {
    logo: boolean;
    text?: string | null;
}

/**
 * Loading component - Full-screen loading indicator with CRADLE logo and spinner
 *
 * @example
 * ```tsx
 * <Loading />
 * ```
 */
export default function Loading({ logo = false, text = null }): JSX.Element {
    return (
        <div className='flex flex-col items-center justify-center h-screen text-center'>
            {logo ||
                (text && (
                    <div className='mb-8 w-[370px]'>
                        {logo && <Logo text={true} />}
                        {text && <span className='text-2xl font-bold'>{text}</span>}
                    </div>
                ))}
            <Spinner className='size-10' />
        </div>
    );
}
