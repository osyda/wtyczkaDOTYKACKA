<?php
/*
Plugin Name: Dotypos Connector
Description: Temporary connector for Dotypos API authorization
Version: 1.0
*/

add_action('init', function () {

    if (isset($_GET['dotypos_connect'])) {

        $client_id = 'restaurant_online_orders';
        $client_secret = '9BnDK4zixrxdk50F7B8d';
        $redirect_uri = 'https://www.mammarosa.pl/dotypos-auth/';
        $state = 'mammarosa_wp_001';

        $timestamp = time();
        $signature = hash_hmac('sha256', (string)$timestamp, $client_secret);

        ?>
        <form id="dotyposForm" method="POST" action="https://admin.dotykacka.cz/client/connect/v2">
            <input type="hidden" name="client_id" value="<?php echo esc_attr($client_id); ?>">
            <input type="hidden" name="timestamp" value="<?php echo esc_attr($timestamp); ?>">
            <input type="hidden" name="signature" value="<?php echo esc_attr($signature); ?>">
            <input type="hidden" name="scope" value="*">
            <input type="hidden" name="redirect_uri" value="<?php echo esc_attr($redirect_uri); ?>">
            <input type="hidden" name="state" value="<?php echo esc_attr($state); ?>">
        </form>
        <script>document.getElementById("dotyposForm").submit();</script>
        <?php
        exit;
    }

});
