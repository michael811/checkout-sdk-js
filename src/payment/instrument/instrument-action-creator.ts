import { createAction, createErrorAction, Action, ThunkAction } from '@bigcommerce/data-store';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';

import { InternalCheckoutSelectors, ReadableCheckoutStore } from '../../checkout';
import { addMinutes, isFuture } from '../../common/date-time';
import { MissingDataError } from '../../common/error/errors';

import Instrument, { InstrumentRequestContext, VaultAccessToken } from './instrument';
import * as actionTypes from './instrument-action-types';
import InstrumentRequestSender from './instrument-request-sender';

export default class InstrumentActionCreator {
    constructor(
        private _instrumentRequestSender: InstrumentRequestSender
    ) {}

    loadInstruments(): ThunkAction<Action, InternalCheckoutSelectors> {
        return store =>
            Observable.create((observer: Observer<Action>) => {
                observer.next(createAction(actionTypes.LOAD_INSTRUMENTS_REQUESTED));

                const { token, storeId, customerId } = this._getInstrumentState(store);

                return this._getValidAccessToken(token)
                    .then(currentToken =>
                        this._instrumentRequestSender.getInstruments(storeId, customerId, currentToken.vaultAccessToken)
                            .then(({ body }) => {
                                observer.next(createAction(actionTypes.LOAD_INSTRUMENTS_SUCCEEDED, body, currentToken));
                                observer.complete();
                            })
                    )
                    .catch(response => {
                        observer.error(createErrorAction(actionTypes.LOAD_INSTRUMENTS_FAILED, response));
                    });
            });
    }

    vaultInstrument(instrument: Instrument): ThunkAction<Action, InternalCheckoutSelectors> {
        return store =>
            Observable.create((observer: Observer<Action>) => {
                observer.next(createAction(actionTypes.VAULT_INSTRUMENT_REQUESTED));

                const { token, storeId, customerId } = this._getInstrumentState(store);

                return this._getValidAccessToken(token)
                    .then(currentToken =>
                        this._instrumentRequestSender.vaultInstrument(storeId, customerId, instrument, currentToken.vaultAccessToken)
                            .then(({ body }) => {
                                observer.next(createAction(actionTypes.VAULT_INSTRUMENT_SUCCEEDED, body, currentToken));
                                observer.complete();
                            })
                    )
                    .catch(response => {
                        observer.error(createErrorAction(actionTypes.VAULT_INSTRUMENT_FAILED, response));
                    });
            });
    }

    deleteInstrument(instrumentId: string): ThunkAction<Action, InternalCheckoutSelectors> {
        return store =>
            Observable.create((observer: Observer<Action>) => {
                observer.next(createAction(actionTypes.DELETE_INSTRUMENT_REQUESTED, undefined, { instrumentId }));

                const { token, storeId, customerId } = this._getInstrumentState(store);

                return this._getValidAccessToken(token)
                    .then(currentToken =>
                        this._instrumentRequestSender.deleteInstrument(storeId, customerId, currentToken.vaultAccessToken, instrumentId)
                            .then(() => {
                                observer.next(createAction(actionTypes.DELETE_INSTRUMENT_SUCCEEDED, undefined, {
                                    instrumentId,
                                    ...currentToken,
                                }));
                                observer.complete();
                            })
                    )
                    .catch(response => {
                        observer.error(createErrorAction(actionTypes.DELETE_INSTRUMENT_FAILED, response, { instrumentId }));
                    });
            });
    }

    private _isValidVaultAccessToken(token: VaultAccessToken): boolean {
        if (!token || !token.vaultAccessToken) {
            return false;
        }

        const expiryBuffer = 2;
        const expiry = addMinutes(new Date(token.vaultAccessExpiry), expiryBuffer);

        return isFuture(expiry);
    }

    private _getValidAccessToken(token: VaultAccessToken): Promise<VaultAccessToken> {
        return this._isValidVaultAccessToken(token)
            ? Promise.resolve(token)
            : this._instrumentRequestSender.getVaultAccessToken()
                .then(({ body = {} }: any) => ({
                    vaultAccessToken: body.data.token,
                    vaultAccessExpiry: body.data.expires_at,
                }));
    }

    private _getInstrumentState(store: ReadableCheckoutStore): InstrumentRequestContext {
        const state = store.getState();
        const config = state.config.getStoreConfig();
        const customer = state.customer.getCustomer();

        if (!config || !customer) {
            throw new MissingDataError('Unable to proceed because "config" or "customer" data is missing.');
        }

        const { customerId } = customer;
        const { storeId } = config.storeProfile;
        const { vaultAccessToken = null, vaultAccessExpiry = null } = state.instruments.getInstrumentsMeta() || {};

        return {
            customerId,
            storeId,
            token: {
                vaultAccessToken,
                vaultAccessExpiry,
            },
        };
    }
}
