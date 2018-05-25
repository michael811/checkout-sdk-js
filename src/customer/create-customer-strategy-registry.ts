import { createFormPoster } from '@bigcommerce/form-poster';
import { createRequestSender } from '@bigcommerce/request-sender';
import { getScriptLoader } from '@bigcommerce/script-loader';

import { CheckoutClient, CheckoutStore } from '../checkout';
import { Registry } from '../common/registry';
import { PaymentMethodActionCreator } from '../payment';
import { createBraintreeVisaCheckoutPaymentProcessor, VisaCheckoutScriptLoader } from '../payment/strategies/braintree';
import { ChasePayScriptLoader } from '../payment/strategies/chasepay';
import { QuoteActionCreator } from '../quote';
import { RemoteCheckoutActionCreator, RemoteCheckoutRequestSender } from '../remote-checkout';
import { AmazonPayScriptLoader } from '../remote-checkout/methods/amazon-pay';

import { CustomerStrategyActionCreator } from '.';
import CustomerActionCreator from './customer-action-creator';
import {
    AmazonPayCustomerStrategy,
    BraintreeVisaCheckoutCustomerStrategy,
    ChasePayCustomerStrategy,
    CustomerStrategy,
    DefaultCustomerStrategy,
} from './strategies';

export default function createCustomerStrategyRegistry(
    store: CheckoutStore,
    client: CheckoutClient
): Registry<CustomerStrategy> {
    const registry = new Registry<CustomerStrategy>();
    const requestSender = createRequestSender();
    const remoteCheckoutRequestSender = new RemoteCheckoutRequestSender(requestSender);

    registry.register('amazon', () =>
        new AmazonPayCustomerStrategy(
            store,
            new PaymentMethodActionCreator(client),
            new RemoteCheckoutActionCreator(remoteCheckoutRequestSender),
            remoteCheckoutRequestSender,
            new AmazonPayScriptLoader(getScriptLoader())
        )
    );

    registry.register('braintreevisacheckout', () =>
        new BraintreeVisaCheckoutCustomerStrategy(
            store,
            new PaymentMethodActionCreator(client),
            new CustomerStrategyActionCreator(registry),
            new QuoteActionCreator(client),
            new RemoteCheckoutActionCreator(remoteCheckoutRequestSender),
            createBraintreeVisaCheckoutPaymentProcessor(getScriptLoader()),
            new VisaCheckoutScriptLoader(getScriptLoader())
        )
    );

    registry.register('chasepay', () =>
        new ChasePayCustomerStrategy(
            store,
            new PaymentMethodActionCreator(client),
            new RemoteCheckoutActionCreator(remoteCheckoutRequestSender),
            new ChasePayScriptLoader(getScriptLoader()),
            requestSender,
            createFormPoster()
        )
    );

    registry.register('default', () =>
        new DefaultCustomerStrategy(
            store,
            new CustomerActionCreator(client)
        )
    );

    return registry;
}
