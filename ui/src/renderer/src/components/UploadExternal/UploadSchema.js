import * as Yup from 'yup';

const UploadSchema = Yup.object().shape({
    title: Yup.string().required('Digest title is required'),
    dataType: Yup.object()
        .shape({
            value: Yup.string().required('Data type is required'),
            label: Yup.string().required(),
            inferEntities: Yup.boolean(),
        })
        .required('Please select a data type'),
    associatedEntry: Yup.object().when('dataType', {
        is: (dataType) => dataType && !dataType.inferEntities,
        then: () =>
            Yup.object()
                .shape({
                    value: Yup.string().required(),
                    label: Yup.string().required(),
                })
                .notRequired(),
        otherwise: () => Yup.array(),
    }),
    files: Yup.array()
        .min(1, 'Please upload a file')
        .max(1, 'Only a single file is allowed')
        .required('File is required'),
});

export default UploadSchema;
