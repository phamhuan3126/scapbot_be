//Run: ts-node checkFtp.ts
import { Client } from 'basic-ftp';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function checkFtpConnection() {
    const client = new Client();
    console.log('Connecting to FTP...');
    console.log('Host:', process.env.FTP_HOST);
    console.log('User:', process.env.FTP_USER);
    console.log('Password:', process.env.FTP_PASS);

    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            secure: false,
        });
        console.log('Kết nối FTP thành công!');
    } catch (error) {
        console.error('Lỗi kết nối FTP:', error);
    } finally {
        client.close();
    }
}

checkFtpConnection();