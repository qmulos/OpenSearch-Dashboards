/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiCompressedFieldPassword,
  EuiForm,
  EuiCompressedFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { FormattedMessage } from '@osd/i18n/react';
import { SigV4ServiceName } from '../../../../../../data_source/common/data_sources';
import { sigV4ServiceOptions } from '../../../../../../data_source_management/public/types';

export interface UpdateAwsCredentialModalProps {
  region: string;
  service: SigV4ServiceName;
  handleUpdateAwsCredential: (accessKey: string, secretKey: string) => void;
  closeUpdateAwsCredentialModal: () => void;
  canManageDataSource: boolean;
}

export const UpdateAwsCredentialModal = ({
  region,
  service,
  handleUpdateAwsCredential,
  closeUpdateAwsCredentialModal,
  canManageDataSource,
}: UpdateAwsCredentialModalProps) => {
  /* State Variables */
  const [newAccessKey, setNewAccessKey] = useState<string>('');
  const [isNewAccessKeyValid, setIsNewAccessKeyValid] = useState<boolean>(true);

  const [newSecretKey, setNewSecretKey] = useState<string>('');
  const [isNewSecretKeyValid, setIsNewSecretKeyValid] = useState<boolean>(true);

  const onClickUpdateAwsCredential = () => {
    if (isFormValid()) {
      handleUpdateAwsCredential(newAccessKey, newSecretKey);
    }
  };

  const isFormValid = () => {
    return !!(newAccessKey && newSecretKey);
  };

  const validateNewAccessKey = () => {
    setIsNewAccessKeyValid(!!newAccessKey);
  };

  const validateNewSecretKey = () => {
    setIsNewSecretKeyValid(!!newSecretKey);
  };

  const renderUpdateAwsCredentialModal = () => {
    return (
      <EuiModal onClose={closeUpdateAwsCredentialModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>
              {
                <FormattedMessage
                  id="dataSourcesManagement.editDataSource.updateStoredAwsCredential"
                  defaultMessage="Update stored AWS credential"
                />
              }
            </h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiCompressedFormRow>
            <EuiText size="m" style={{ fontWeight: 300 }}>
              {
                <FormattedMessage
                  id="dataSourcesManagement.editDataSource.updateStoredAwsCredentialDescription"
                  defaultMessage="Update access key and secret key to reflect accurate aws credential to gain access to the endpoint."
                />
              }
            </EuiText>
          </EuiCompressedFormRow>
          <EuiSpacer size="m" />

          <EuiForm data-test-subj="data-source-update-aws-credential">
            {/* Service Name */}
            <EuiCompressedFormRow
              label={i18n.translate('dataSourcesManagement.editDataSource.serviceName', {
                defaultMessage: 'Service Name',
              })}
            >
              <EuiText size="s" data-test-subj="data-source-update-credential-service-name">
                {/* @ts-expect-error TS2339 TODO(ts-error): fixme */}
                {sigV4ServiceOptions.find((option) => option.value === service)?.text}
              </EuiText>
            </EuiCompressedFormRow>
            {/* Region */}
            <EuiCompressedFormRow
              label={i18n.translate('dataSourcesManagement.editDataSource.region', {
                defaultMessage: 'Region',
              })}
            >
              <EuiText size="s" data-test-subj="data-source-update-credential-region">
                {region}
              </EuiText>
            </EuiCompressedFormRow>

            {/* updated access key */}
            <EuiCompressedFormRow
              label={i18n.translate('dataSourcesManagement.editDataSource.newAccessKey', {
                defaultMessage: 'Updated access key',
              })}
              isInvalid={!isNewAccessKeyValid}
            >
              <EuiCompressedFieldPassword
                name="updatedAccessKey"
                data-test-subj="updateStoredAwsCredentialUpdatedAccessKeyField"
                placeholder={i18n.translate(
                  'dataSourcesManagement.editDataSource.newAccessKeyPlaceHolder',
                  {
                    defaultMessage: 'Updated access key',
                  }
                )}
                type={'dual'}
                value={newAccessKey}
                isInvalid={!isNewAccessKeyValid}
                spellCheck={false}
                onChange={(e) => setNewAccessKey(e.target.value)}
                onBlur={validateNewAccessKey}
                disabled={!canManageDataSource}
              />
            </EuiCompressedFormRow>

            {/* updated secret key */}
            <EuiCompressedFormRow
              label={i18n.translate('dataSourcesManagement.editDataSource.newSecretKey', {
                defaultMessage: 'Updated secret key',
              })}
              isInvalid={!isNewSecretKeyValid}
            >
              <EuiCompressedFieldPassword
                name="updatedSecretKey"
                data-test-subj="updateStoredAwsCredentialUpdatedSecretKeyField"
                placeholder={i18n.translate(
                  'dataSourcesManagement.editDataSource.newSecretKeyPlaceHolder',
                  {
                    defaultMessage: 'Updated secret key',
                  }
                )}
                type={'dual'}
                value={newSecretKey}
                isInvalid={!isNewSecretKeyValid}
                spellCheck={false}
                onChange={(e) => setNewSecretKey(e.target.value)}
                onBlur={validateNewSecretKey}
                disabled={!canManageDataSource}
              />
            </EuiCompressedFormRow>
          </EuiForm>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiSmallButtonEmpty
            data-test-subj="updateStoredAwsCredentialCancelBtn"
            onClick={closeUpdateAwsCredentialModal}
          >
            {
              <FormattedMessage
                id="dataSourcesManagement.editDataSource.cancel"
                defaultMessage="Cancel"
              />
            }
          </EuiSmallButtonEmpty>
          <EuiSmallButton
            type="submit"
            data-test-subj="updateStoredAwsCredentialConfirmBtn"
            onClick={onClickUpdateAwsCredential}
            fill={isFormValid()}
            disabled={!isFormValid()}
          >
            {i18n.translate('dataSourcesManagement.editDataSource.updateStoredAwsCredential', {
              defaultMessage: 'Update stored AWS credential',
            })}
          </EuiSmallButton>
        </EuiModalFooter>
      </EuiModal>
    );
  };

  /* Return the modal */
  return <div> {renderUpdateAwsCredentialModal()} </div>;
};
