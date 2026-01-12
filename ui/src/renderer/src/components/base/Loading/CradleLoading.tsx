import { Spinner } from '@/components/ui/spinner';
import Logo from '../Logo/Logo';

const CradleLoading = () => {
    return (
        <div className='flex flex-col items-center justify-center h-screen text-center'>
            <div className='mb-8 w-[370px]'>
                <Logo text={true} />
            </div>
            <Spinner className='size-10' />
        </div>
    );
};

export default CradleLoading;
