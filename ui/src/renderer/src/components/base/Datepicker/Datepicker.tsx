import { Calendar } from 'iconoir-react';
import { forwardRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker.css';

interface DatepickerProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (dates: [Date | null, Date | null]) => void;
    placeholderText?: string;
    className?: string;
    /**
     * Forces the calendar popover to remain open while this component is mounted.
     * Useful for "filter row" UIs (e.g. table headers) where we want the user to
     * complete a range selection without the popover collapsing mid-way.
     */
    forceOpen?: boolean;
    /**
     * Controlled open state for the popover. When provided, this takes precedence.
     * (Useful when embedding in UIs that re-render frequently.)
     */
    open?: boolean;
    onClickOutside?: () => void;
    onCalendarClose?: () => void;
}

const Datepicker = ({
    startDate,
    endDate,
    onChange,
    placeholderText = 'Select date range',
    className,
    forceOpen = false,
    open,
    onClickOutside,
    onCalendarClose,
}: DatepickerProps) => {
    // Custom Input to match the style
    const CustomInput = forwardRef<HTMLInputElement, any>(
        (
            { value, onClick, onChange, onBlur, onFocus, onKeyDown, className, placeholder },
            ref,
        ) => (
            <div className='relative flex items-center'>
                <Calendar className='absolute left-3 w-4 h-4 text-cradle-text-muted z-10 pointer-events-none' />
                <input
                    ref={ref}
                    value={value}
                    onClick={onClick}
                    onChange={onChange}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder ?? placeholderText}
                    className={[
                        // Keep this input slim by default; callers can opt into `cradle-search`
                        // and override padding with `!px-*` / `!py-*` if needed.
                        'bg-transparent outline-none font-mono text-cradle-text-primary placeholder:text-cradle-text-muted',
                        // Space for the left icon (works with `.cradle-search-with-icon-left` too).
                        'pl-9',
                        // Avoid forced height/padding here — thickness should be controlled by `className`.
                        'w-full',
                        className ?? '',
                    ].join(' ')}
                />
            </div>
        ),
    );

    CustomInput.displayName = 'CustomDateInput';

    return (
        <div className='relative w-full'>
            <ReactDatePicker
                selected={startDate}
                onChange={onChange}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                showTimeSelect
                // For range selection, keep the popover open until the consumer decides to close it.
                // In ListView we close the filter UI once both dates are selected.
                shouldCloseOnSelect={false}
                // When used inside table headers, we want the calendar to appear immediately on focus.
                openOnFocus
                open={open ?? (forceOpen ? true : undefined)}
                onClickOutside={onClickOutside}
                onCalendarClose={onCalendarClose}
                dateFormat='yyyy-MM-dd HH:mm'
                portalId='portal-root'
                customInput={<CustomInput className={className} />}
                isClearable={false}
                placeholderText={placeholderText}
                wrapperClassName='w-full'
                popperClassName='z-[9999]'
            />
        </div>
    );
};

export default Datepicker;
