import React, { useState } from 'react';

import {
  View,
  Text,
  Button,
  StyleSheet,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import { Device } from 'react-native-ble-plx';

import { Buffer } from 'buffer';

import { bleManager } from './services/blehm10';


// =====================================================
// UUIDs do BT05 / HM-10
// =====================================================

const SERVICE_UUID =
  '0000ffe0-0000-1000-8000-00805f9b34fb';

const CHARACTERISTIC_UUID =
  '0000ffe1-0000-1000-8000-00805f9b34fb';


// =====================================================
// APP
// =====================================================

export default function App() {

  const [connectedDevice, setConnectedDevice] =
    useState<Device | null>(null);

  const [status, setStatus] =
    useState('Desconectado');

  const [temperature, setTemperature] =
    useState('--');


  // =====================================================
  // PEDIR PERMISSÕES BLUETOOTH
  // =====================================================

  const requestBluetoothPermission = async () => {

    if (Platform.OS !== 'android') {
      return true;
    }

    if (Platform.Version >= 31) {

      const scanPermission =
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        );

      const connectPermission =
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        );

      return (
        scanPermission ===
          PermissionsAndroid.RESULTS.GRANTED &&
        connectPermission ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }

    const locationPermission =
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

    return (
      locationPermission ===
      PermissionsAndroid.RESULTS.GRANTED
    );
  };


  // =====================================================
  // CONECTAR AO BT05
  // =====================================================

  const connectToDevice = async (
    device: Device
  ) => {

    try {

      console.log(
        '🔗 Conectando ao:',
        device.name || device.id
      );

      setStatus('Conectando...');

      // Para o scan
      bleManager.stopDeviceScan();


      // -----------------------------------------------
      // CONECTA
      // -----------------------------------------------

      const connected =
        await bleManager.connectToDevice(
          device.id
        );

      console.log(
        '✅ Conectado!'
      );

      setStatus(
        '🟢 Bluetooth conectado'
      );


      // -----------------------------------------------
      // DESCOBRIR SERVIÇOS
      // -----------------------------------------------

      const discovered =
        await connected
          .discoverAllServicesAndCharacteristics();

      console.log(
        '✅ Serviços descobertos!'
      );


      // -----------------------------------------------
      // MOSTRAR SERVIÇOS
      // -----------------------------------------------

      const services =
        await discovered.services();

      for (const service of services) {

        console.log(
          '🔵 SERVICE:',
          service.uuid
        );

        const characteristics =
          await service.characteristics();

        for (const characteristic of characteristics) {

          console.log(
            '🟢 CHARACTERISTIC:',
            characteristic.uuid
          );

          console.log(
            '   Read:',
            characteristic.isReadable
          );

          console.log(
            '   Write:',
            characteristic.isWritableWithResponse,
            characteristic.isWritableWithoutResponse
          );

          console.log(
            '   Notify:',
            characteristic.isNotifiable
          );
        }
      }


      // -----------------------------------------------
      // SALVA DISPOSITIVO
      // -----------------------------------------------

      setConnectedDevice(
        discovered
      );


      // =================================================
      // OUVIR DADOS DA FFE1
      // =================================================

      console.log(
        '👂 Escutando temperatura...'
      );

      discovered.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (error, characteristic) => {

          // ---------------------------------------------
          // ERRO
          // ---------------------------------------------

          if (error) {

            console.log(
              '❌ Erro recebendo dados:',
              error
            );

            return;
          }


          // ---------------------------------------------
          // DADO RECEBIDO
          // ---------------------------------------------

          if (
            characteristic &&
            characteristic.value
          ) {

            try {

              const data =
                Buffer.from(
                  characteristic.value,
                  'base64'
                ).toString('utf-8');


              console.log(
                '📥 Recebido:',
                data
              );


              // -----------------------------------------
              // LIMPA O TEXTO
              // -----------------------------------------

              const cleanData =
                data.trim();


              // -----------------------------------------
              // CONVERTE PARA NÚMERO
              // -----------------------------------------

              const value =
                parseFloat(cleanData);


              // -----------------------------------------
              // VERIFICA SE É TEMPERATURA
              // -----------------------------------------

              if (!isNaN(value)) {

                setTemperature(
                  value.toFixed(1)
                );

                console.log(
                  '🌡️ Temperatura:',
                  value
                );
              }

            } catch (error) {

              console.log(
                '❌ Erro convertendo dados:',
                error
              );

            }
          }
        }
      );

    } catch (error) {

      console.log(
        '❌ Erro ao conectar:',
        error
      );

      setStatus(
        '🔴 Erro ao conectar'
      );

    }
  };


  // =====================================================
  // PROCURAR BT05
  // =====================================================

  const scanDevices = async () => {

    const permission =
      await requestBluetoothPermission();


    if (!permission) {

      console.log(
        '❌ Permissão Bluetooth negada'
      );

      setStatus(
        '🔴 Permissão Bluetooth negada'
      );

      return;
    }


    console.log(
      '✅ Permissão Bluetooth concedida'
    );


    setStatus(
      '🔎 Procurando BT05...'
    );


    console.log(
      '🔎 Procurando BT05...'
    );


    // Limpa conexão anterior
    setConnectedDevice(null);

    setTemperature('--');


    // -----------------------------------------------
    // INICIA SCAN
    // -----------------------------------------------

    bleManager.startDeviceScan(
      null,
      null,
      async (error, device) => {


        // ---------------------------------------------
        // ERRO
        // ---------------------------------------------

        if (error) {

          console.log(
            '❌ Erro Bluetooth:',
            error
          );

          bleManager.stopDeviceScan();

          setStatus(
            '🔴 Erro no Bluetooth'
          );

          return;
        }


        if (!device) {
          return;
        }


        // ---------------------------------------------
        // MOSTRA DISPOSITIVO
        // ---------------------------------------------

        console.log(
          '📡 Encontrado:',
          device.name || 'SEM NOME',
          device.id
        );


        // ---------------------------------------------
        // PROCURAR BT05
        // ---------------------------------------------

        if (
          device.name?.startsWith('BT05')
        ) {

          console.log(
            '🎯 BT05 encontrado!'
          );


          // Para o scan
          bleManager.stopDeviceScan();


          // Conecta automaticamente
          await connectToDevice(
            device
          );
        }

      }
    );


    // -----------------------------------------------
    // TEMPO MÁXIMO DE SCAN
    // -----------------------------------------------

    setTimeout(() => {

      bleManager.stopDeviceScan();

      console.log(
        '🛑 Busca finalizada'
      );

    }, 10000);

  };


  // =====================================================
  // INTERFACE
  // =====================================================

  return (

    <View style={styles.container}>


      {/* TÍTULO */}

      <Text style={styles.title}>
        Termostatus
      </Text>


      {/* STATUS */}

      <Text style={styles.status}>
        {status}
      </Text>


      {/* TEMPERATURA */}

      <View style={styles.temperatureBox}>

        <Text style={styles.temperatureLabel}>
          Temperatura
        </Text>

        <Text style={styles.temperature}>
          {temperature} °C
        </Text>

      </View>


      {/* BOTÃO */}

      <Button
        title="Procurar Bluetooth"
        onPress={scanDevices}
      />


      {/* DISPOSITIVO CONECTADO */}

      {connectedDevice && (

        <View style={styles.deviceBox}>

          <Text style={styles.connected}>
            🟢 BT05 conectado
          </Text>

          <Text>
            ID: {connectedDevice.id}
          </Text>

        </View>

      )}

    </View>
  );
}


// =====================================================
// ESTILOS
// =====================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 30,
    paddingTop: 80,
    alignItems: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  status: {
    fontSize: 18,
    marginBottom: 30,
  },

  temperatureBox: {
    alignItems: 'center',
    marginBottom: 40,
  },

  temperatureLabel: {
    fontSize: 18,
  },

  temperature: {
    fontSize: 50,
    fontWeight: 'bold',
    marginTop: 10,
  },

  deviceBox: {
    width: '100%',
    padding: 20,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 30,
  },

  connected: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },

});