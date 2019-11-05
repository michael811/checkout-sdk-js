import { memoizeOne } from '@bigcommerce/memoize';
import { find } from 'lodash';

import { createSelector } from '../common/selector';
import { ConfigState, DEFAULT_STATE } from '../config';
import { Country } from '../geography';

import FormField from './form-field';

export default interface FormSelector {
    getShippingAddressFields(countries: Country[] | undefined, countryCode: string): FormField[];
    getBillingAddressFields(countries: Country[] | undefined, countryCode: string): FormField[];
}

export type FormSelectorFactory = (state: ConfigState) => FormSelector;

export function createFormSelectorFactory(): FormSelectorFactory {
    const getShippingAddressFields = createSelector(
        (state: ConfigState) => state.data,
        config => (countries: Country[] = [], countryCode: string) => {
            const selectedCountry = find(countries, { code: countryCode });
            const fields = config ? config.storeConfig.formFields.shippingAddressFields : [];

            return fields.map((field: any) => processField(field, countries, selectedCountry));
        }
    );

    const getBillingAddressFields = createSelector(
        (state: ConfigState) => state.data,
        config => (countries: Country[] = [], countryCode: string) => {
            const selectedCountry = find(countries, { code: countryCode });
            const fields = config ? config.storeConfig.formFields.billingAddressFields : [];

            return fields.map((field: any) => processField(field, countries, selectedCountry));
        }
    );

    function processField(field: FormField, countries: Country[], selectedCountry?: Country): FormField {
        if (field.name === 'countryCode') {
            return processCountry(field, countries, selectedCountry);
        }

        if (field.name === 'stateOrProvince') {
            return processProvince(field, selectedCountry);
        }

        if (field.name === 'postalCode') {
            return processsPostCode(field, selectedCountry);
        }

        return field;
    }

    function processCountry(field: FormField, countries: Country[] = [], country?: Country): FormField {
        if (!countries.length) {
            return field;
        }

        const { code = '' } = country || {};
        const items = countries.map(({ code, name }: any) => ({
            value: code,
            label: name,
        }));

        return {
            ...field,
            options: { items },
            default: code,
            type: 'array',
            fieldType: 'dropdown',
            itemtype: 'string',
        };
    }

    function processProvince(field: FormField, country?: Country): FormField {
        const { subdivisions = [], requiresState } = country || {};

        if (!subdivisions.length) {
            return {
                ...field,
                required: requiresState == null ? false : requiresState,
            };
        }

        const items = subdivisions.map(({ code, name }: any) => ({
            value: code,
            label: name,
        }));

        return {
            ...field,
            name: 'stateOrProvinceCode',
            options: { items },
            required: requiresState == null ? true : requiresState,
            type: 'array',
            fieldType: 'dropdown',
            itemtype: 'string',
        };
    }

    function processsPostCode(field: FormField, country?: Country): FormField {
        const { hasPostalCodes = [] } = country || {};

        if (hasPostalCodes === undefined) {
            return field;
        }

        return { ...field, required: Boolean(hasPostalCodes) };
    }

    return memoizeOne((
        state: ConfigState = DEFAULT_STATE
    ): FormSelector => {
        return {
            getShippingAddressFields: getShippingAddressFields(state),
            getBillingAddressFields: getBillingAddressFields(state),
        };
    });
}
