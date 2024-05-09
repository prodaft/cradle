export default function LoginRegisterButton(props) {
    return (
        <div>
            <button
                type="submit"
                className="flex w-full justify-center text-gray-900 dark:text-gray-100 rounded-md bg-cradle2 px-3 py-1.5 text-sm font-semibold leading-6 shadow-sm hover:opacity-90 hover:shadow-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cradle2"
            >
                {props.labelText}
            </button>
        </div>
    );
}